const { IncidentCreationAction } = require('../../../domain/incident-creation-action');

class MockIncidentCreationAction extends IncidentCreationAction {
  constructor({ ruleOverrides = [] } = {}) {
    super({ type: IncidentCreationAction.TYPES.CREATE_INCIDENT, ruleOverrides });
  }
}

module.exports = { MockIncidentCreationAction };
