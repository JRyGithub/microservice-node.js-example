const sinon = require('sinon');
const { expect } = require('chai');
const { handler: listener } = require('.');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const {
  ProductDamagedInWarehouseIncident
} = require('../../modules/incident/domain/incident/types/product-damaged-in-warehouse');
const { RpcRefundRepository } = require('../../modules/incident/adapters/rpc-refund-repository');
const FIXTURES = require('../../../tests/fixtures/incidents/product-damaged-in-warehouse');
const IncidentModel = require('../../modules/models/incident');
const { InvalidAttachmentValidationPayloadError } = require('../../modules/incident/errors');
const { ORIGIN_TYPES } = require('../../modules/incident/domain/incident/base');

const buildHeaders = (event = 'started') => ({
  'x-destination': `topic/document-validation.${event}:v1`
});

describe('listeners/document-validation.*:v1', () => {
  let incident;
  let invoke;
  let incidentRepository;
  let productRepository;
  let refundRepository;
  let logger;
  let dependencies;
  let invokeLambdaResponses;

  beforeEach(async () => {
    logger = {
      warn: sinon.spy(),
      error: sinon.spy(),
      debug: sinon.spy()
    };

    invokeLambdaResponses = new Map([
      ['contracts-from-parcel.list:v1', () => [{ id: '123' }]],
      ['refund.create:v1', () => ({ id: FIXTURES.REFUND_ID })],
      ['parcel-picklist.list:v1', () => [{ parcelId: 894770481 }]]
    ]);
    invoke = sinon.fake(async (lambdaName, ...args) =>
      invokeLambdaResponses.has(lambdaName)
        ? invokeLambdaResponses.get(lambdaName)(...args)
        : undefined
    );

    incidentRepository = new SqlIncidentRepository();
    incident = new ProductDamagedInWarehouseIncident({
      id: 'INCIDENT-001',
      ownerId: 10001,
      origin: ORIGIN_TYPES.SHIPPER,
      entityId: 'PRODUCT-0001',
      entityType: 'PRODUCT',
      attachmentValidations: [
        {
          id: 'V-001',
          type: 'BUYING_INVOICE',
          validationId: 'VALIDATION-001',
          status: 'CREATED'
        }
      ],
      concerns: [
        {
          id: 'ITEM|MERCHANDISE',
          type: 'MERCHANDISE',
          entityType: 'ITEM',
          entityId: 'ITEM-001'
        }
      ]
    });
    productRepository = {
      findById: sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }))
    };
    refundRepository = new RpcRefundRepository(invoke);
    dependencies = { logger, productRepository, refundRepository };

    await incidentRepository.create(incident);
  });

  afterEach(async () => {
    await IncidentModel.query().delete();
  });

  it('should not do anything when event is not pertinent', async () => {
    const headers = buildHeaders('unknown-event');
    const data = {
      id: 'VALIDATION-999',
      status: 'STARTED'
    };

    const result = await listener({ data, headers }, dependencies);

    expect(result).to.eql({ updated: 0 });
    expect(logger.debug).to.have.been.calledWithMatch(/ignored event/, {
      event: 'topic/document-validation.unknown-event:v1'
    });
  });

  it('should not do anything when incident was not found', async () => {
    const headers = buildHeaders();
    const data = {
      id: 'VALIDATION-999',
      status: 'STARTED'
    };

    const result = await listener({ data, headers }, dependencies);

    expect(result).to.eql({ updated: 0 });
    expect(logger.warn).to.have.been.calledWithMatch(/does not match/, {
      id: 'VALIDATION-999'
    });
  });

  it('should start incident when started event is received', async () => {
    const headers = buildHeaders('started');
    const data = {
      id: 'VALIDATION-001',
      status: 'STARTED'
    };

    const result = await listener({ data, headers }, dependencies);

    expect(result).to.eql({ updated: 1 });

    // refresh from persistance layer
    incident = await incidentRepository.findById('INCIDENT-001');
    expect(incident.status).to.eql('RESOLVED');
    expect(incident.refundStatus).to.eql('STARTED');
    expect(incident.attachmentValidations[0]).to.deep.include({
      type: 'BUYING_INVOICE',
      status: 'STARTED'
    });
  });

  describe('when validated event is received', () => {
    let headers;
    let data;

    beforeEach(() => {
      headers = buildHeaders('validated');
      data = {
        id: 'VALIDATION-001',
        status: 'VALIDATED',
        outputPayload: {
          skuValue: 50
        }
      };
    });

    it('should reject invalid payload formats', async () => {
      data.outputPayload.skuValue = 'invalid value';
      await expect(listener({ data, headers }, dependencies)).to.be.rejectedWith(
        InvalidAttachmentValidationPayloadError
      );

      expect(logger.error).to.have.been.calledWithMatch(/wrong payload/, {
        id: data.id,
        payload: data.outputPayload
      });
    });

    it('should resolve incident and persist refund informations', async () => {
      const result = await listener({ data, headers }, dependencies);

      expect(result).to.eql({ updated: 1 });

      // refresh from persistance layer
      incident = await incidentRepository.findById('INCIDENT-001');
      expect(incident.status).to.eql('RESOLVED');
      expect(incident.refundStatus).to.eql('RESOLVED');
      expect(incident.refundId).to.eql(FIXTURES.REFUND_ID);
      expect(incident.attachmentValidations[0]).to.deep.include({
        type: 'BUYING_INVOICE',
        status: 'VALIDATED'
      });

      expect(incident.concerns[0]).to.deep.include({
        amount: '50.000',
        amountType: 'VALUE'
      });
    });

    it('should have sent a new refund on billing side', async () => {
      await listener({ data, headers }, dependencies);

      expect(invoke).to.have.been.calledThrice;
      const [path, payload] = invoke.args[2];

      expect(path).to.be.equal('refund.create:v1');
      expect(payload).to.include({
        source: 'INCIDENT',
        externalId: incident.id,
        userId: incident.ownerId
      });
      expect(payload.items).to.have.length(1);
      expect(payload.items[0]).to.deep.include({
        entityId: 'ITEM-001',
        entityType: 'ITEM',
        type: 'MERCHANDISE_REFUND',
        amount: 50,
        algorithm: 'SUM_EQUALS'
      });
    });
  });
});
