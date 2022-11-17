const { expect } = require('chai');
const { BaseIncident } = require('../incident/base');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const {
  AlreadyResolvedIncidentCreationDeniedError
} = require('../incident-creation-denied-error/already-resolved');
const { IncidentCreationRule } = require('./abstract');
const { AlreadyResolved } = require('.');

describe('creation-rule/already-resolved', () => {
  let similarIncidents;
  let rule;
  let incidentType;

  beforeEach(() => {
    similarIncidents = [
      {
        status: BaseIncident.STATUSES.RESOLVED
      }
    ];
    incidentType = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
    rule = new AlreadyResolved();
  });

  async function runRule() {
    return rule.run({ similarIncidents, incidentType });
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
      expect(result.error).to.be.instanceOf(AlreadyResolvedIncidentCreationDeniedError);
    });
  }

  describe('when similarIncident does NOT exist', () => {
    beforeEach(() => {
      similarIncidents = undefined;
    });

    itShouldContinue();
  });

  describe('when similarIncident status is NOT RESOLVED', () => {
    beforeEach(() => {
      similarIncidents = [{ status: BaseIncident.STATUSES.CREATED }];
    });

    itShouldContinue();
  });

  Object.values(BaseIncident.REFUND_STATUSES).forEach((choosenRefundStatus) => {
    if (choosenRefundStatus === BaseIncident.REFUND_STATUSES.RESOLVED) return;
    Object.values(BaseIncident.REFUND_STATUSES).forEach((choosenStatus) => {
      describe('when similarIncident is REFUND and CONTINUE', () => {
        if (choosenStatus === BaseIncident.STATUSES.RESOLVED) return;
        beforeEach(() => {
          similarIncidents = [
            {
              resolutionTypeApplied: BaseIncident.RESOLUTION_TYPES.REFUND,
              status: choosenStatus,
              refundStatus: choosenRefundStatus
            }
          ];
        });

        itShouldContinue();
      });
    });
  });

  Object.values(BaseIncident.REFUND_STATUSES).forEach((choosenStatus) => {
    describe('when similarIncident is RESHIP and CONTINUE', () => {
      if (choosenStatus === BaseIncident.STATUSES.RESOLVED) return;
      beforeEach(() => {
        similarIncidents = [
          {
            resolutionTypeApplied: BaseIncident.RESOLUTION_TYPES.RESHIP,
            status: choosenStatus
          }
        ];
      });

      itShouldContinue();
    });
  });

  describe('when similarIncident is REFUND and DENY', () => {
    beforeEach(() => {
      similarIncidents = [
        {
          resolutionTypeApplied: BaseIncident.RESOLUTION_TYPES.REFUND,
          status: BaseIncident.STATUSES.RESOLVED,
          refundStatus: BaseIncident.REFUND_STATUSES.RESOLVED
        }
      ];
    });

    itShouldDeny();
  });

  describe('when similarIncident is RESHIP and DENY', () => {
    beforeEach(() => {
      similarIncidents = [
        {
          resolutionTypeApplied: BaseIncident.RESOLUTION_TYPES.RESHIP,
          status: BaseIncident.STATUSES.RESOLVED
        }
      ];
    });

    itShouldDeny();
  });

  describe('when everything is OK', () => {
    itShouldDeny();
  });
});
