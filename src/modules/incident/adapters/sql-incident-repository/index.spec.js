const { expect } = require('chai');
const { createIncident, INCIDENT_TYPES: TYPE } = require('../../domain/incident');
const IncidentModel = require('../../../models/incident');
const { SqlIncidentRepository } = require('.');
const { BaseIncident, ORIGIN_TYPES } = require('../../domain/incident/base');

const anIncident = (overrides = {}) =>
  createIncident({
    ownerId: 1001,
    origin: ORIGIN_TYPES.ZENDESK,
    originId: '2001',
    entityId: 'PRODUCT-001',
    entityType: 'PRODUCT',
    type: TYPE.PRODUCT_DAMAGED_IN_WAREHOUSE,
    attachments: [],
    ...overrides
  });

describe('adapters/sql-incident-repository', () => {
  let repository;

  beforeEach(() => {
    repository = new SqlIncidentRepository();
  });

  afterEach(async () => {
    await IncidentModel.query().delete();
  });

  describe('create', () => {
    it('should insert a blank incident without attachments', async () => {
      const incident = anIncident();

      await repository.create(incident);

      const models = await IncidentModel.query().eager('attachments');
      expect(models).to.have.length(1);
      const [model] = models;
      expect(model.entityId).to.eql(incident.entityId);
      expect(model.entityType).to.eql(incident.entityType);
      expect(model.type).to.eql(incident.type);
    });

    it('should insert an incident and its two attachments', async () => {
      const incident = anIncident({
        attachments: [
          { type: 'BUYING_INVOICE', fileKey: 's3://1' },
          { type: 'BUYING_INVOICE', fileKey: 's3://2' }
        ]
      });

      await repository.create(incident);

      const models = await IncidentModel.query().eager('attachments');
      expect(models).to.have.length(1);
      const [model] = models;
      expect(model.attachments).to.have.length(2);
      model.attachments.forEach((doc) => expect(doc.fileKey).to.match(/^s3:/));
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const incidents = [
        anIncident({ id: '10001' }),
        anIncident({ id: '10002', status: BaseIncident.STATUSES.STARTED }),
        anIncident({ id: '10003', status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10004', status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10011', ownerId: 1002 }),
        anIncident({
          id: '10012',
          ownerId: 1002,
          status: BaseIncident.STATUSES.STARTED,
          refundStatus: BaseIncident.REFUND_STATUSES.STARTED
        }),
        anIncident({ id: '10013', ownerId: 1002, status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10014', ownerId: 1002, status: BaseIncident.STATUSES.RESOLVED })
      ];

      await Promise.all(incidents.map((incident) => repository.create(incident)));
    });

    it('should filter shippers incidents', async () => {
      const results = await repository.query({ ownerId: 1002 });

      expect(results).to.have.length(4);
      expect(results.sort().map(({ id }) => id)).to.eql(['10011', '10012', '10013', '10014']);
    });

    it('should filter shippers incidents by status', async () => {
      const results = await repository.query({
        ownerId: 1002,
        status: BaseIncident.STATUSES.STARTED
      });

      expect(results).to.have.length(1);
      expect(results.map(({ id }) => id)).to.eql(['10012']);
    });

    it('should filter incidents by status', async () => {
      const results = await repository.query({ status: BaseIncident.STATUSES.STARTED });

      expect(results).to.have.length(2);
      expect(results.sort().map(({ id }) => id)).to.eql(['10002', '10012']);
    });

    it('should filter incidents by refund status', async () => {
      const results = await repository.query({
        refundStatus: BaseIncident.REFUND_STATUSES.STARTED
      });

      expect(results).to.have.length(1);
      expect(results.map(({ id }) => id)).to.eql(['10012']);
    });

    it('should filter incidents by refund status and by type', async () => {
      const results = await repository.query({
        refundStatus: BaseIncident.REFUND_STATUSES.STARTED,
        type: TYPE.PRODUCT_DAMAGED_IN_WAREHOUSE
      });

      expect(results).to.have.length(1);
      expect(results.map(({ id }) => id)).to.eql(['10012']);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      const incidents = [
        anIncident({ id: '10001' }),
        anIncident({ id: '10002', status: BaseIncident.STATUSES.STARTED }),
        anIncident({ id: '10003', status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10004', status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10011', ownerId: 1002 }),
        anIncident({
          id: '10012',
          ownerId: 1002,
          status: BaseIncident.STATUSES.STARTED,
          refundStatus: BaseIncident.REFUND_STATUSES.STARTED
        }),
        anIncident({ id: '10013', ownerId: 1002, status: BaseIncident.STATUSES.RESOLVED }),
        anIncident({ id: '10014', ownerId: 1002, status: BaseIncident.STATUSES.RESOLVED })
      ];

      await Promise.all(incidents.map((incident) => repository.create(incident)));
    });

    it('should  filter shippers incidents', async () => {
      const results = await repository.count({ ownerId: 1002 });

      expect(results).to.eql(4);
    });
  });

  describe('bulkupdate', () => {
    beforeEach(async () => {
      const incidents = [
        anIncident({ id: '10001', ownerId: 1002 }),
        anIncident({ id: '10002', ownerId: 1002 }),
        anIncident({ id: '10003', ownerId: 1002 })
      ];

      await Promise.all(incidents.map((incident) => repository.create(incident)));
    });

    it('should bulk update records', async () => {
      const toUpdate = await repository.query({ ownerId: 1002 });
      await repository.bulkupdate(
        toUpdate.map((incident) => {
          incident.setRefundSentToHeadOfFinanceAt();

          return incident;
        })
      );

      const updated = await repository.query({ ownerId: 1002 });

      expect(updated).to.have.length(3);
      expect(updated.map(({ setRefundSentToHeadOfFinanceAt }) => setRefundSentToHeadOfFinanceAt)).to
        .not.be.null;
      expect(updated.map(({ setRefundSentToHeadOfFinanceAt }) => setRefundSentToHeadOfFinanceAt)).to
        .not.be.undefined;
    });
  });
});
