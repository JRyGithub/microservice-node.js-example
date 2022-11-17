/**
 * Describes creation rules execution result
 * May be either
 *  - allowed
 *  - denied with error
 *
 * > NOTE: store partially context if needed
 */
class CheckCreationRulesResult {
  constructor() {
    /**
     * @type {Boolean}
     */
    this.allowed = true;
  }

  markAsAllowed() {
    this.allowed = true;
    /**
     * @type {IncidentCreationDeniedError | void}
     */
    // eslint-disable-next-line no-undefined
    this.error = undefined;

    return this;
  }

  /**
   * @param {IncidentCreationDeniedError} error
   */
  markAsDenied({ error, details }) {
    this.allowed = false;
    this.error = error;
    this.details = details;

    return this;
  }
}

module.exports = { CheckCreationRulesResult };
