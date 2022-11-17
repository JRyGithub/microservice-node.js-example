const { ACTIONS } = require('./constants/actions');

/**
 * @abstract
 */
class IncidentCreationRuleOverride {
  static get ACTIONS() {
    return ACTIONS;
  }

  /**
   * @param {Object} param
   * @param {string} param.rule
   * @param {IncidentCreationRuleOverrideAction} param.action
   */
  constructor({ rule, action }) {
    /**
     * @readonly
     * @type {string}
     */
    this.rule = rule;
    /**
     * @readonly
     * @type {IncidentCreationRuleOverrideAction}
     */
    this.action = action;
  }
}

/**
 * @typedef {keyof IncidentCreationRuleOverride.ACTIONS} IncidentCreationRuleOverrideAction
 */

module.exports = { IncidentCreationRuleOverride };
