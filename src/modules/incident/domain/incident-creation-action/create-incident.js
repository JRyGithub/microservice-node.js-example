const { IncidentCreationAction } = require('./abstract');

class CreateIncidentIncidentCreationAction extends IncidentCreationAction {
  /**
   *
   * @param {Object} param
   * @param {IncidentType} param.incidentType
   * @param {IncidentCreationRuleOverride[] | void} param.ruleOverrides
   */
  constructor({ incidentType, ruleOverrides = [] } = {}) {
    super({ type: IncidentCreationAction.TYPES.CREATE_INCIDENT, ruleOverrides });
    /**
     * @readonly
     * @type {IncidentType}
     */
    this.incidentType = incidentType;
  }
}

module.exports = { CreateIncidentIncidentCreationAction };
