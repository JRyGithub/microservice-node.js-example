const { expect } = require('chai');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const {
  DeliveredOnTimeIncidentCreationDeniedError
} = require('../incident-creation-denied-error/delivered-on-time');
const { IncidentCreationRule } = require('./abstract');
const { DeliveredOnTime } = require('./delivered-on-time');

describe('creation-rule/delivered-on-time', () => {
  let parcel;
  let deliveryPromise;
  let rule;
  let incidentType;
  let currentDate;

  beforeEach(() => {
    parcel = {
      deliveredAt: new Date('2021-01-01').toISOString()
    };
    deliveryPromise = {
      before: new Date('2021-01-02').toISOString()
    };
    incidentType = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
    rule = new DeliveredOnTime();
    currentDate = new Date();
  });

  async function runRule() {
    return rule.run({ parcel, deliveryPromise, incidentType, currentDate });
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
      expect(result.error).to.be.instanceOf(DeliveredOnTimeIncidentCreationDeniedError);
    });
  }

  describe('when parcel does NOT exist', () => {
    beforeEach(() => {
      parcel = undefined;
    });

    itShouldContinue();
  });

  describe('when deliveryPromise does NOT exist', () => {
    beforeEach(() => {
      deliveryPromise = undefined;
    });

    itShouldContinue();
  });

  describe('when parcel deliveredAt does NOT exist', () => {
    beforeEach(() => {
      parcel.deliveredAt = undefined;
    });

    itShouldContinue();
  });

  describe('when deliveryPromise before does NOT exist', () => {
    beforeEach(() => {
      deliveryPromise.before = undefined;
    });

    itShouldContinue();
  });

  describe('when parcel is NOT delivered earlier then promised', () => {
    beforeEach(() => {
      parcel.deliveredAt = new Date('2021-01-02').toISOString();
      deliveryPromise.before = new Date('2021-01-01').toISOString();
    });

    itShouldContinue();
  });

  describe('when everything is OK', () => {
    itShouldDeny();
  });
});
