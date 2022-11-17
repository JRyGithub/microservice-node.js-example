const { IncidentCreationDeniedError } = require('./abstract');

class DeliveredOnTimeIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.DeliveredOnTime;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: DeliveredOnTimeIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { DeliveredOnTimeIncidentCreationDeniedError };
