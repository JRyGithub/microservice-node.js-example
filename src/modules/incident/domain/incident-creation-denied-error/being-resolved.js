const { IncidentCreationDeniedError } = require('./abstract');

class BeingResolvedIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.BeingResolved;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: BeingResolvedIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { BeingResolvedIncidentCreationDeniedError };
