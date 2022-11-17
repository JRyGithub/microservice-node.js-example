const { expect } = require('chai');
const { PARCEL_STATUS_CARRIER_DELIVERED } = require('../../../core/constants/parcels');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const {
  NotDeliveredIncidentCreationDeniedError
} = require('../incident-creation-denied-error/not-delivered');
const { IncidentCreationRule } = require('./abstract');
const { Delivered } = require('./delivered');

describe('creation-rule/delivered', () => {
  let parcel;
  let rule;
  let incidentType;

  beforeEach(() => {
    parcel = {
      status: PARCEL_STATUS_CARRIER_DELIVERED,
      deliveredAt: new Date().toISOString()
    };
    incidentType = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
    rule = new Delivered();
  });

  async function runRule() {
    return rule.run({ parcel, incidentType });
  }

  function itShouldContinue() {
    it('should continue', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.CONTINUE);
    });
  }

  function itShouldDeny() {
    it('should deny', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.DENY);
      expect(result.error).to.be.instanceOf(NotDeliveredIncidentCreationDeniedError);
    });
  }

  describe('when parcel status is NOT CARRIER_DELIVERED', () => {
    beforeEach(() => {
      parcel.status = 'CREATED';
    });

    itShouldDeny();
  });

  describe('when parcel deliveredAt is NOT defined', () => {
    beforeEach(() => {
      parcel.deliveredAt = undefined;
    });

    itShouldDeny();
  });

  describe('when everything is OK', () => {
    itShouldContinue();
  });
});
