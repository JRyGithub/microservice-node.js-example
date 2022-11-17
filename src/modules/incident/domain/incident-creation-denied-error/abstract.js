const { REASONS } = require('./constants');

/**
 * @abstract
 */
class IncidentCreationDeniedError {
  static get REASONS() {
    return REASONS;
  }

  /**
   *
   * @param {Object} param
   * @param {IncidentCreationDeniedErrorReason} param.reason
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ reason, actions = [] }) {
    /**
     * @readonly
     * @type {IncidentCreationDeniedErrorReason}
     */
    this.reason = reason;
    /**
     * @readonly
     * @type {IncidentCreationAction[]}
     */
    this.actions = actions;
  }
}

/**
 * @typedef {keyof IncidentCreationDeniedError.REASONS} IncidentCreationDeniedErrorReason
 */

module.exports = { IncidentCreationDeniedError };
