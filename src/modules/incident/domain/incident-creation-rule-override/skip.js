const { IncidentCreationRuleOverride } = require('./abstract');

class SkipIncidentCreationRuleOverride extends IncidentCreationRuleOverride {
  constructor({ rule }) {
    super({ rule, action: IncidentCreationRuleOverride.ACTIONS.SKIP });
  }
}

module.exports = { SkipIncidentCreationRuleOverride };
