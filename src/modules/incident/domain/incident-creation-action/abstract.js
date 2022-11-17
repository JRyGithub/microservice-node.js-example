const { TYPES } = require('./constants/types');

/**
 * @abstract
 */
class IncidentCreationAction {
  static get TYPES() {
    return TYPES;
  }

  /**
   *
   * @param {Object} param
   * @param {IncidentCreationActionType} param.type
   * @param {IncidentCreationRuleOverride[] | void} param.ruleOverrides
   */
  constructor({ type, ruleOverrides }) {
    /**
     * @readonly
     * @type {IncidentCreationActionType}
     */
    this.type = type;
    /**
     * @readonly
     * @type {IncidentCreationRuleOverride[] | void}
     */
    this.ruleOverrides = ruleOverrides;
  }
}

/**
 * @typedef {keyof IncidentCreationAction.TYPES} IncidentCreationActionType
 */

module.exports = { IncidentCreationAction };
