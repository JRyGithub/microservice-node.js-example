const { expect } = require('chai');
const { createDenyLog } = require('../../domain/deny-log');
const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');
const { RULES } = require('../../domain/creation-rule/constants/rules');
const IncidentCreationDenyLogModel = require('../../../models/incident-creation-deny-log');
const { SqlDenyLogRepository } = require('.');

const aDenyReason = (overrides = {}) =>
  createDenyLog({
    parcelId: 'CUB123123',
    incidentType: INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
    reason: RULES.AlreadyDelivered,
    ...overrides
  });

describe('adapters/sql-deny-log-repository', () => {
  let repository;

  beforeEach(() => {
    repository = new SqlDenyLogRepository();
  });

  afterEach(async () => {
    await IncidentCreationDenyLogModel.query().delete();
  });

  describe('create deny log', () => {
    it('should create deny log', async () => {
      const logRecord = aDenyReason();

      await repository.create(logRecord);

      const models = await IncidentCreationDenyLogModel.query();
      expect(models).to.have.length(1);
      const [model] = models;
      expect(model.reason).to.eql(logRecord.reason);
    });
  });
});
