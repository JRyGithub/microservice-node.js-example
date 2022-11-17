const { expect } = require('chai');
const { BaseIncident, RESOLUTION_TYPES } = require('../incident/base');
const {
  BeingResolvedIncidentCreationDeniedError
} = require('../incident-creation-denied-error/being-resolved');
const { IncidentCreationRule } = require('./abstract');
const { BeingResolved } = require('./being-resolved');

describe('creation-rule/being-resolved', () => {
  let similarIncidents;
  let rule;

  beforeEach(() => {
    similarIncidents = [
      {
        status: BaseIncident.STATUSES.CREATED
      }
    ];
    rule = new BeingResolved();
  });

  async function runRule() {
    return rule.run({ similarIncidents });
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
      expect(result.error).to.be.instanceOf(BeingResolvedIncidentCreationDeniedError);
    });
  }

  describe('when similarIncident does NOT exist', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-undefined
      similarIncidents = undefined;
    });

    itShouldContinue();
  });

  describe('when similarIncident status is RESOLVED(RESHIP)', () => {
    beforeEach(() => {
      similarIncidents = [
        { status: BaseIncident.STATUSES.RESOLVED, resolutionTypeApplied: RESOLUTION_TYPES.RESHIP }
      ];
    });

    itShouldContinue();
  });

  describe('when similarIncident status is CREATED(RESHIP)', () => {
    beforeEach(() => {
      similarIncidents = [
        { status: BaseIncident.STATUSES.CREATED, resolutionTypeApplied: RESOLUTION_TYPES.RESHIP }
      ];
    });

    itShouldDeny();
  });

  describe('when similarIncident status is RESOLVED(REFUND)', () => {
    beforeEach(() => {
      similarIncidents = [
        {
          status: BaseIncident.STATUSES.RESOLVED,
          resolutionTypeApplied: RESOLUTION_TYPES.RESHIP,
          refundStatus: BaseIncident.REFUND_STATUSES.RESOLVED
        }
      ];
    });

    itShouldContinue();
  });

  describe('when similarIncident status is CREATED(REFUND)', () => {
    beforeEach(() => {
      similarIncidents = [
        {
          status: BaseIncident.STATUSES.RESOLVED,
          resolutionTypeApplied: RESOLUTION_TYPES.REFUND,
          refundStatus: BaseIncident.REFUND_STATUSES.CREATED
        }
      ];
    });

    itShouldDeny();
  });

  describe('when everything is OK', () => {
    itShouldDeny();
  });
});
