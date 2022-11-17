const sinon = require('sinon');
const { expect } = require('chai');
const dayjs = require('dayjs');
const FIXTURES = require('../../../../../../../tests/fixtures/incidents/product-lost-in-warehouse');
const { ProductLostInWarehouseIncident } = require('.');
const { Concern } = require('../../../concern');
const { AttachmentValidation } = require('../../../attachment-validation');
const { ValidationCatalogService } = require('../../../../services/validation-catalog');
const { MissingAttachmentError, InvalidStatusError } = require('../../../../errors');

const INCIDENT_VALUES = FIXTURES.CREATE_INCIDENT_PAYLOAD;

describe('domain/incidents/product-lost-in-warehouse', () => {
  let incidentRepository;
  let documentValidationRepository;
  let productRepository;
  let itemRepository;
  let preprocessDeps;
  let validationCatalog;

  beforeEach(() => {
    incidentRepository = {
      create: sinon.spy(),
      findConcernsById: sinon.spy(async () => [])
    };
    documentValidationRepository = {
      validate: sinon.spy(async () => 'DOCUMENT_VALIDATION-001')
    };
    productRepository = {
      findById: sinon.spy(async () => FIXTURES.PRODUCT)
    };
    itemRepository = {
      getItemsLostAfter: sinon.spy(async () => ['ITEM-001', 'ITEM-002'])
    };
    preprocessDeps = {
      itemRepository,
      sqlProductRepository: productRepository,
      incidentRepository
    };
    validationCatalog = new ValidationCatalogService({
      productRepository,
      documentValidationRepository
    });
  });

  describe('preprocessing', () => {
    it('should reject if product is not found', async () => {
      const incident = new ProductLostInWarehouseIncident(INCIDENT_VALUES);

      // SKU resolves to nothing
      productRepository.findById = () => null;

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: false, type: 'FIND_PRODUCT' }
      ]);
    });

    it('should reject if product does not belong to user', async () => {
      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        // wrong owner of given product
        ownerId: INCIDENT_VALUES.ownerId + 1
      });

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: false, type: 'FIND_PRODUCT' }
      ]);
    });

    it('should reject if product is a bundle', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        isBundle: true
      }));

      const incident = new ProductLostInWarehouseIncident({ ...INCIDENT_VALUES });

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: false, type: 'CHECK_PRODUCT_TYPE' }
      ]);
    });

    it('should reject if no lost was found', async () => {
      itemRepository.getItemsLostAfter = sinon.spy(async () => []);

      const incident = new ProductLostInWarehouseIncident({ ...INCIDENT_VALUES });

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: true, type: 'CHECK_PRODUCT_TYPE' },
        { success: false, type: 'FIND_MATCHING_CONCERNS' }
      ]);

      const [scubId, minDate] = itemRepository.getItemsLostAfter.args[0];
      const expectedDay = dayjs().subtract(90, 'days').format('YYYY-MM-DD');
      expect(scubId).to.eql('SCUB-001');
      expect(dayjs(minDate).format('YYYY-MM-DD')).to.eql(expectedDay);
    });

    it('should reject if all lost were already reported', async () => {
      incidentRepository.findConcernsById = sinon.spy(async () => [
        { id: 'MERCHANDISE|ITEM-001' },
        { id: 'MERCHANDISE|ITEM-002' }
      ]);

      const incident = new ProductLostInWarehouseIncident({ ...INCIDENT_VALUES });

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: true, type: 'CHECK_PRODUCT_TYPE' },
        { success: true, type: 'FIND_MATCHING_CONCERNS' },
        { success: false, type: 'FILTER_EXISTING_CONCERNS' }
      ]);
    });

    it('should report only not already reported lost', async () => {
      incidentRepository.findConcernsById = sinon.spy(async () => [{ id: 'MERCHANDISE|ITEM-001' }]);

      const incident = new ProductLostInWarehouseIncident({ ...INCIDENT_VALUES });

      const { preprocessing } = await incident.preprocess(preprocessDeps);

      expect(preprocessing.checks).to.includeArrayObjects([
        { success: true, type: 'CHECK_PRODUCT_TYPE' },
        { success: true, type: 'FIND_MATCHING_CONCERNS' },
        { success: true, type: 'FILTER_EXISTING_CONCERNS' }
      ]);

      expect(incident.concerns).to.have.length(1);
      expect(incident.concerns[0]).to.include({
        entityId: 'ITEM-002',
        type: 'MERCHANDISE'
      });
    });
  });

  describe('attachment validations', () => {
    it('should create a document validation', async () => {
      const incident = new ProductLostInWarehouseIncident({ ...INCIDENT_VALUES });
      await incident.startAttachmentValidations({
        validationCatalog,
        product: { id: 'PRODUCT-001' }
      });

      // should have looked up a product
      expect(productRepository.findById.called).to.be.true;
      const [[productId]] = productRepository.findById.args;
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

    it('should reject if buying invoice is absent', async () => {
      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        // no buying invoice in attachments
        attachments: [
          {
            type: 'COMMERCIAL_INVOICE',
            fileKey: 's3://foo/bar'
          }
        ]
      });

      await expect(
        incident.startAttachmentValidations({
          validationCatalog,
          product: { id: 'PRODUCT-001' }
        })
      ).to.be.rejectedWith(MissingAttachmentError);
    });
  });

  describe('compute concern refund', () => {
    const NOT_ALLOWED_STATUSES = ['CREATED', 'STARTED', 'REJECTED'];
    NOT_ALLOWED_STATUSES.forEach((status) => {
      it(`reject for status ${status} not allowed for refund`, async () => {
        const incident = new ProductLostInWarehouseIncident({
          ...INCIDENT_VALUES,
          status
        });
        await expect(incident.computeConcernRefunds({ productRepository })).to.be.rejectedWith(
          InvalidStatusError
        );
      });
    });

    it('use a default weight when the value is missing', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: null
      }));

      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        status: 'RESOLVED',
        concerns: [new Concern(FIXTURES.CONCERNS[0])],
        attachmentValidations: [
          new AttachmentValidation({
            ...FIXTURES.ATTACHMENT_VALIDATIONS[0],
            payload: {
              skuValue: 10000
            }
          })
        ]
      });

      await incident.computeConcernRefunds({ productRepository });

      const [concern] = incident.concerns;

      expect(concern).to.include({
        amount: 200 * 0.033,
        amountType: 'VALUE'
      });
    });

    it('select the weight based value when skuValue is higher than weight×33', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }));

      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        status: 'RESOLVED',
        concerns: [new Concern(FIXTURES.CONCERNS[0])],
        attachmentValidations: [
          new AttachmentValidation({
            ...FIXTURES.ATTACHMENT_VALIDATIONS[0],
            payload: {
              skuValue: 10000
            }
          })
        ]
      });

      await incident.computeConcernRefunds({ productRepository });

      const [concern] = incident.concerns;

      expect(concern).to.include({
        amount: 2000 * 0.033,
        amountType: 'VALUE'
      });
    });

    it('select the invoice sku value when skuValue is lower than weight×33', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }));

      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        status: 'RESOLVED',
        concerns: [new Concern(FIXTURES.CONCERNS[0])],
        attachmentValidations: [
          new AttachmentValidation({
            ...FIXTURES.ATTACHMENT_VALIDATIONS[0],
            payload: {
              skuValue: 50
            }
          })
        ]
      });

      await incident.computeConcernRefunds({ productRepository });

      const [concern] = incident.concerns;

      expect(concern).to.include({
        amount: 50,
        amountType: 'VALUE'
      });
    });

    it('compute on multi concerns', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }));

      const concerns = FIXTURES.CONCERNS.map((concern) => new Concern(concern));

      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        status: 'RESOLVED',
        concerns,
        attachmentValidations: [
          new AttachmentValidation({
            ...FIXTURES.ATTACHMENT_VALIDATIONS[0],
            payload: {
              skuValue: 50
            }
          })
        ]
      });

      await incident.computeConcernRefunds({ productRepository });

      incident.concerns.forEach((concern) =>
        expect(concern).to.include({
          amount: 50,
          amountType: 'VALUE'
        })
      );
    });

    it('Get product information from incident', async () => {
      productRepository.findById = sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }));

      const incident = new ProductLostInWarehouseIncident({
        ...INCIDENT_VALUES,
        status: 'RESOLVED',
        concerns: [new Concern(FIXTURES.CONCERNS[0])],
        attachmentValidations: [
          new AttachmentValidation({
            ...FIXTURES.ATTACHMENT_VALIDATIONS[0],
            payload: {
              skuValue: 50
            }
          })
        ]
      });

      await incident.computeConcernRefunds({ productRepository });

      const {
        args: [[productId]]
      } = productRepository.findById;
      expect(productId).to.be.equal(incident.entityId);
    });
  });
});
