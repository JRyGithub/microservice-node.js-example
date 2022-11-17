const { IncidentCreationDeniedError } = require('./abstract');

class NotDeliveredIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return IncidentCreationDeniedError.REASONS.NotDelivered;
  }

  /**
   * @param {Object} param
   * @param {IncidentCreationAction[] | void} param.actions
   */
  constructor({ actions } = {}) {
    super({ reason: NotDeliveredIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { NotDeliveredIncidentCreationDeniedError };
