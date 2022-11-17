const { expect } = require('chai');
const {
  CountryNotEligibleIncidentCreationDeniedError
} = require('../incident-creation-denied-error/country-eligibility');
const { IncidentCreationRule } = require('./abstract');
const { CountryNotEligible } = require('./country-eligibility');

describe('creation-rule/country-eligibility', () => {
  let parcel;
  let rule;

  beforeEach(() => {
    parcel = {
      address: {
        country: 'FR'
      }
    };
    rule = new CountryNotEligible();
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
      expect(result.error).to.be.instanceOf(CountryNotEligibleIncidentCreationDeniedError);
    });
  }

  describe('when parcel does NOT exist', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-undefined
      parcel = undefined;
    });

    itShouldDeny();
  });

  describe('when address does NOT exist', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-undefined
      parcel = {
        address: undefined
      };
    });

    itShouldDeny();
  });

  describe('when country not eligible', () => {
    beforeEach(() => {
      parcel = {
        address: {
          country: 'AL'
        }
      };
    });

    itShouldDeny();
  });

  describe('when everything is OK', () => {
    itShouldContinue();
  });
});
