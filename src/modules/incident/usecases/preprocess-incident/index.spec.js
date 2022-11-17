const sinon = require('sinon');
const { expect } = require('chai');
const FIXTURES = require('../../../../../tests/fixtures/incidents/product-damaged-in-warehouse');
const { preprocessIncidentUsecase } = require('.');
const { InvalidIncidentTypeError } = require('../../errors');
const { PreprocessingResult } = require('../../domain/incident/preprocessing-result');

const PAYLOAD = FIXTURES.CREATE_INCIDENT_PAYLOAD;

describe('usecases/preprocess-incident', () => {
  let preprocessIncident;
  let productRepository;
  let itemRepository;
  let incidentRepository;

  beforeEach(() => {
    incidentRepository = {
      create: sinon.spy(),
      findConcernsById: sinon.spy(async () => [])
    };
    productRepository = {
      findById: sinon.spy(async () => FIXTURES.PRODUCT)
    };
    itemRepository = {
      getItemsDamagedAfter: sinon.spy(async () => ['ITEM-001'])
    };
    preprocessIncident = preprocessIncidentUsecase({
      sqlProductRepository: productRepository,
      itemRepository,
      incidentRepository
    });
  });

  it('should reject an invalid incident type', async () => {
    const payload = {
      ...PAYLOAD,
      type: 'INVALID_TYPE'
    };

    await expect(preprocessIncident.execute(payload)).to.be.rejectedWith(
      InvalidIncidentTypeError,
      /INVALID_TYPE/
    );
  });

  it('should give details of the preprocessing', async () => {
    const payload = { ...PAYLOAD };

    const result = await preprocessIncident.execute(payload);

    expect(result.preprocessing instanceof PreprocessingResult).to.be.true;
    expect(result.preprocessing.checks[0]).to.deep.include({
      success: true,
      type: 'CHECK_PRODUCT_TYPE'
    });
    expect(result.preprocessing.checks[1]).to.deep.include({
      success: true,
      type: 'FIND_MATCHING_CONCERNS'
    });
  });
});
