/* eslint-disable no-underscore-dangle */
const { IncidentCreationRule } = require('../../../domain/creation-rule');

class MockIncidentCreationRule extends IncidentCreationRule {
  static get RULE() {
    return 'MockIncidentCreationRule';
  }

  constructor({ returns = true } = {}) {
    super({ rule: MockIncidentCreationRule.RULE });
    /**
     * @private
     * @readonly
     * @type {boolean}
     */
    this._returns = returns;
  }

  predicateFactory() {
    return () => this._returns;
  }
}

module.exports = { MockIncidentCreationRule };
