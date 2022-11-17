const sinon = require('sinon');
const { expect } = require('chai');
const FIXTURES = require('../../../../../tests/fixtures/incidents/product-damaged-in-warehouse');
const { createIncidentUsecase } = require('.');
const { InvalidIncidentTypeError, IncidentPreprocessingError } = require('../../errors');

const PAYLOAD = FIXTURES.CREATE_INCIDENT_PAYLOAD;

describe('usecases/create-incident', () => {
  let incidentRepository;
  let createIncident;
  let documentValidationRepository;
  let sqlProductRepository;
  let itemRepository;

  beforeEach(() => {
    incidentRepository = {
      create: sinon.spy(),
      findConcernsById: sinon.spy(async () => [])
    };
    documentValidationRepository = {
      validate: sinon.spy(async () => 'DOCUMENT_VALIDATION-001')
    };
    sqlProductRepository = {
      findById: sinon.spy(async () => FIXTURES.PRODUCT)
    };
    itemRepository = {
      getItemsDamagedAfter: sinon.spy(async () => ['ITEM-001'])
    };
    createIncident = createIncidentUsecase({
      incidentRepository,
      documentValidationRepository,
      sqlProductRepository,
      itemRepository
    });
  });

  it('should reject an invalid incident type', async () => {
    const payload = {
      ...PAYLOAD,
      type: 'INVALID_TYPE'
    };

    await expect(createIncident.execute(payload)).to.be.rejectedWith(
      InvalidIncidentTypeError,
      /INVALID_TYPE/
    );
  });

  it('should persist an incident from given params', async () => {
    const payload = { ...PAYLOAD };

    const result = await createIncident.execute(payload);

    // should return a string
    expect(result).to.be.a('object');

    // should have persisted incident in repo
    expect(incidentRepository.create.calledOnce).to.be.true;
    const [[callPayload]] = incidentRepository.create.args;
    expect(callPayload).to.deep.include(payload);
    expect(callPayload.id).to.be.a('string');

    expect(callPayload.concerns).to.have.length(1);
    expect(callPayload.concerns[0]).to.deep.include({
      id: 'MERCHANDISE|ITEM-001',
      entityId: 'ITEM-001',
      entityType: 'ITEM',
      type: 'MERCHANDISE'
    });

    expect(callPayload.attachmentValidations).to.have.length(1);
    expect(callPayload.attachmentValidations[0]).to.deep.include({
      validationId: 'DOCUMENT_VALIDATION-001',
      incidentId: callPayload.id,
      type: 'BUYING_INVOICE',
      status: 'CREATED'
    });

    expect(callPayload.source).to.eql('SHIPPER');
    expect(callPayload.resolutionTypeSelected).to.eql('REFUND');
    expect(callPayload.resolutionTypeApplied).to.be.undefined;
  });

  describe('preprocessing', () => {
    it('should reject if product is not found', async () => {
      const payload = { ...PAYLOAD };

      // SKU resolves to nothing
      sqlProductRepository.findById = () => null;

      await expect(createIncident.execute(payload)).to.be.rejectedWith(
        IncidentPreprocessingError,
        /FIND_PRODUCT/
      );
    });
  });

  describe('attachment validations', () => {
    it('should create a document validation', async () => {
      const payload = { ...PAYLOAD };

      await createIncident.execute(payload);

      // should have looked up a product
      expect(sqlProductRepository.findById.called).to.be.true;
      const [[productId]] = sqlProductRepository.findById.args;
      expect(productId).to.eql('PRODUCT-001');

      // should have requested a document validation
      expect(documentValidationRepository.validate.calledOnce).to.be.true;
      const [[type, [file], input]] = documentValidationRepository.validate.args;
      expect(type).to.eql('BUYING_INVOICE');
      expect(file.fileKey).to.eql('s3://foo/bar');
      expect(input).to.eql({
        product: {
          sku: FIXTURES.PRODUCT.sku,
          name: FIXTURES.PRODUCT.name
        }
      });
    });
  });
});
