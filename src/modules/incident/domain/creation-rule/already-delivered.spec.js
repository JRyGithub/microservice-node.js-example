const { expect } = require('chai');
const { PARCEL_STATUS_CARRIER_DELIVERED } = require('../../../core/constants/parcels');
const {
  AlreadyDeliveredIncidentCreationDeniedError
} = require('../incident-creation-denied-error/already-delivered');
const { IncidentCreationRule } = require('./abstract');
const { AlreadyDelivered } = require('./already-delivered');

describe('creation-rule/already-delivered', () => {
  let parcel;
  let rule;

  beforeEach(() => {
    parcel = {
      status: PARCEL_STATUS_CARRIER_DELIVERED,
      deliveredAt: new Date().toISOString()
    };
    rule = new AlreadyDelivered();
  });

  async function runRule() {
    return rule.run({ parcel });
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
      expect(result.error).to.be.instanceOf(AlreadyDeliveredIncidentCreationDeniedError);
    });
  }

  describe('when parcel status is NOT CARRIER_DELIVERED', () => {
    beforeEach(() => {
      parcel.status = 'CREATED';
    });

    itShouldContinue();
  });

  describe('when parcel deliveredAt is NOT defined', () => {
    beforeEach(() => {
      parcel.deliveredAt = undefined;
    });

    itShouldContinue();
  });

  describe('when everything is OK', () => {
    itShouldDeny();
  });
});
