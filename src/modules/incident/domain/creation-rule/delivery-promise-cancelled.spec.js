const { expect } = require('chai');
const { IncidentCreationRule } = require('./abstract');
const { DeliveryPromiseCancelled } = require('./delivery-promise-cancelled');

describe('creation-rule/delivery-promise-cancelled', () => {
  let deliveryPromise;
  let rule;

  beforeEach(() => {
    deliveryPromise = {
      status: 'CANCELLED',
      deliveredAt: new Date().toISOString()
    };
    rule = new DeliveryPromiseCancelled();
  });

  async function runRule() {
    return rule.run({ deliveryPromise });
  }

  function itShouldContinue() {
    it('should continue', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.CONTINUE);
    });
  }

  function itShouldAllow() {
    it('should deny', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.ALLOW);
    });
  }

  describe('when deliveryPromise does NOT exist', () => {
    beforeEach(() => {
      // eslint-disable-next-line no-undefined
      deliveryPromise = undefined;
    });

    itShouldContinue();
  });

  describe('when deliveryPromise status is NOT CANCELLED', () => {
    beforeEach(() => {
      deliveryPromise.status = 'RUNNING';
    });

    itShouldContinue();
  });

  describe('when everything is OK', () => {
    itShouldAllow();
  });
});
