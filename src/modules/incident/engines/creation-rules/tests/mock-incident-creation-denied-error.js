const { IncidentCreationDeniedError } = require('../../../domain/incident-creation-denied-error');

class MockIncidentCreationDeniedError extends IncidentCreationDeniedError {
  static get REASON() {
    return 'MockReason';
  }

  constructor({ actions = [] } = {}) {
    super({ reason: MockIncidentCreationDeniedError.REASON, actions });
  }
}

module.exports = { MockIncidentCreationDeniedError };
