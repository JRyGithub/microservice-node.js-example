const { expect } = require('chai');
const {
  StillOnTimeIncidentCreationDeniedError
} = require('../incident-creation-denied-error/still-on-time');
const { IncidentCreationRule } = require('./abstract');
const { StillOnTime } = require('./still-on-time');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');

describe('creation-rule/still-on-time', () => {
  let deliveryPromise;
  let currentDate;
  let rule;
  let incidentType;
  let parcel;

  beforeEach(() => {
    deliveryPromise = {
      before: new Date('2020-12-31').toISOString()
    };
    parcel = {
      deliveredAt: new Date('2020-12-25').toISOString()
    };
    currentDate = new Date('2021-01-02');
    rule = new StillOnTime();
    incidentType = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
  });

  async function runRule() {
    return rule.run({ deliveryPromise, currentDate, incidentType, parcel });
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
      expect(result.error).to.be.instanceOf(StillOnTimeIncidentCreationDeniedError);
    });
  }

  describe('when deliveryPromise does NOT exist', () => {
    beforeEach(() => {
      deliveryPromise = undefined;
    });

    itShouldContinue();
  });

  describe('when deliveryPromise before does NOT exist', () => {
    beforeEach(() => {
      deliveryPromise.before = undefined;
    });

    itShouldContinue();
  });

  describe('when deliveryPromise before is NOT less then currentDate', () => {
    beforeEach(() => {
      deliveryPromise.before = new Date('2021-01-02').toISOString();
      currentDate = new Date('2021-01-01');
      parcel.deliveredAt = undefined;
    });

    itShouldDeny();
  });

  describe('when everything is OK', () => {
    itShouldContinue();
  });
});
