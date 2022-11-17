const { IncidentCreationDeniedError } = require('./abstract');

class AlreadyResolvedIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.AlreadyResolved;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: AlreadyResolvedIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { AlreadyResolvedIncidentCreationDeniedError };
