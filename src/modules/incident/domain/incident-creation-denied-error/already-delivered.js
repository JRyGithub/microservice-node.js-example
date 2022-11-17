const { IncidentCreationDeniedError } = require('./abstract');

class AlreadyDeliveredIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.AlreadyDelivered;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: AlreadyDeliveredIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { AlreadyDeliveredIncidentCreationDeniedError };
