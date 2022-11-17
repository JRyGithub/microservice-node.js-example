const { expect } = require('chai');
const sinon = require('sinon');

const { ServerError } = require('@devcubyn/core.errors');
const { createIncident, INCIDENT_TYPES } = require('../../domain/incident');

const { Concern } = require('../../domain/concern');
const { RpcRefundRepository } = require('.');
const { ORIGIN_TYPES } = require('../../domain/incident/base');

const FIXTURES = {
  REFUND_ID: 98765432,
  OWNER_ID: 1001
};

const anIncident = (overrides = {}) =>
  createIncident({
    id: '123',
    ownerId: FIXTURES.OWNER_ID,
    origin: ORIGIN_TYPES.ZENDESK,
    originId: '2001',
    entityId: 'PRODUCT-001',
    entityType: 'PRODUCT',
    type: INCIDENT_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
    attachments: [],
    concerns: [],
    ...overrides
  });

const aConcern = (overrides = {}) =>
  new Concern({
    id: 'CONCERN-01',
    incidentId: '123',
    type: Concern.TYPES.MERCHANDISE,
    entityType: Concern.ENTITY_TYPES.ITEM,
    entityId: '001',
    amount: 50,
    amountType: Concern.AMOUNT_TYPES.VALUE,
    ...overrides
  });

describe('adapters/rpc-refund-repository', () => {
  let invoke;
  let repository;
  let invokeLambdaResponses;

  beforeEach(() => {
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
    repository = new RpcRefundRepository(invoke);
  });

  describe('createFromIncident (automated)', () => {
    it('should send the refund into billing with incident information', async () => {
      const incident = anIncident({
        concerns: [aConcern()]
      });

      const result = await repository.createFromIncident(incident);
      expect(result).to.be.equal(FIXTURES.REFUND_ID);

      expect(invoke.calledThrice).to.be.true;
      const [path, payload] = invoke.args[2];
      expect(path).to.be.equal('refund.create:v1');
      expect(payload).to.include({
        source: 'INCIDENT',
        externalId: incident.id,
        userId: incident.ownerId
      });
    });

    it('should send concerns converted into refund items', async () => {
      const incident = anIncident({
        concerns: [
          aConcern({
            entityId: '12345678',
            entityType: Concern.ENTITY_TYPES.ITEM,
            type: Concern.TYPES.MERCHANDISE,
            amount: 20,
            amountType: Concern.AMOUNT_TYPES.VALUE
          }),
          aConcern({
            entityId: '87654321',
            entityType: Concern.ENTITY_TYPES.PARCEL,
            type: Concern.TYPES.PARCEL_SHIPPING,
            amount: 50,
            amountType: Concern.AMOUNT_TYPES.PERCENT
          })
        ]
      });
      await repository.createFromIncident(incident);

      expect(invoke.calledThrice).to.be.true;
      const [, { items }] = invoke.args[2];

      expect(items).to.have.length(3);
      expect(items[0]).to.include({
        entityId: '12345678',
        entityType: Concern.ENTITY_TYPES.ITEM,
        type: 'MERCHANDISE_REFUND',
        amount: 20,
        algorithm: 'SUM_EQUALS'
      });
      expect(items[1]).to.include({
        entityId: '87654321',
        entityType: Concern.ENTITY_TYPES.PARCEL,
        type: 'PARCEL_SHIPPING',
        amount: 50,
        algorithm: 'SUM_PERCENT'
      });

      // shipping fee triggers petrol fee refund as well
      expect(items[2]).to.include({
        entityId: '87654321',
        entityType: Concern.ENTITY_TYPES.PARCEL,
        type: 'PARCEL_PETROL_FEE',
        amount: 50,
        algorithm: 'SUM_PERCENT'
      });
    });
  });

  describe('createFromIncident (manual)', () => {
    it('should send refund items on entity PARCEL when entity is a PARCEL', async () => {
      const incident = anIncident({
        type: INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
        isManuallyUpdated: true,
        entityType: 'PARCEL',
        entityId: '100000001',
        merchandiseValue: 100
      });

      await repository.createFromIncident(incident);

      expect(invoke.calledTwice).to.be.true;
      const [, { items }] = invoke.args[1];

      expect(items[0]).to.include({
        entityId: '100000001',
        entityType: 'PARCEL',
        type: 'MERCHANDISE_REFUND',
        amount: 100,
        algorithm: 'EQUALS'
      });
    });

    it('should send refund items on entity USER otherwise', async () => {
      const incident = anIncident({
        type: INCIDENT_TYPES.PRODUCT_LOST_IN_WAREHOUSE,
        isManuallyUpdated: true,
        entityType: 'PRODUCT',
        entityId: '100000001',
        merchandiseValue: 100
      });
      await repository.createFromIncident(incident);

      expect(invoke.calledOnce).to.be.true;
      const [[, { items }]] = invoke.args;

      expect(items[0]).to.include({
        entityId: FIXTURES.OWNER_ID,
        entityType: 'USER',
        type: 'MERCHANDISE_REFUND',
        amount: 100,
        algorithm: 'EQUALS'
      });
    });

    it('should refuse sending shipping refunds when entity is not a parcel', async () => {
      const incident = anIncident({
        type: INCIDENT_TYPES.PRODUCT_LOST_IN_WAREHOUSE,
        isManuallyUpdated: true,
        entityType: 'PRODUCT',
        entityId: '100000001',
        shippingFeesAmount: 50
      });

      await expect(repository.createFromIncident(incident)).to.be.rejectedWith(
        ServerError,
        /parcel/
      );

      expect(invoke.calledOnce).to.be.false;
    });

    it('should refuse saving empty refunds', async () => {
      const incident = anIncident({
        isManuallyUpdated: true,
        shippingFeesAmount: null,
        merchandiseValue: null
      });
      await expect(repository.createFromIncident(incident)).to.be.rejectedWith(
        ServerError,
        /empty/
      );
    });

    it('should refuse saving if recipient without shipper id', async () => {
      const incident = anIncident({
        type: INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
        isManuallyUpdated: true,
        entityType: 'PARCEL',
        entityId: '100000001',
        source: 'RECIPIENT',
        merchandiseValue: 100,
        resolutionTypeApplied: 'RESHIP',
        reshipParcelId: '100000002'
      });
      await expect(repository.createFromIncident(incident)).to.be.rejectedWith(ServerError, /user/);
    });

    it('should send refund items on entity PARCEL when source is reipient and parcel is re-shipped', async () => {
      const incident = anIncident({
        type: INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
        isManuallyUpdated: true,
        entityType: 'PARCEL',
        entityId: '100000001',
        source: 'RECIPIENT',
        merchandiseValue: 100,
        resolutionTypeApplied: 'RESHIP',
        relatedShipperId: '10001',
        reshipParcelId: '100000002'
      });

      await repository.createFromIncident(incident);

      expect(invoke.calledTwice).to.be.true;
      const [, { items }] = invoke.args[1];

      expect(items[0]).to.include({
        entityId: '100000002',
        entityType: 'PARCEL',
        type: 'MERCHANDISE_REFUND',
        amount: 100,
        algorithm: 'EQUALS'
      });
    });
  });
});
