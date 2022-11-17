/* eslint-disable no-continue */
// eslint-disable-next-line no-unused-vars
const { IncidentCreationRule } = require('../../domain/creation-rule');
const { IncidentCreationRuleOverride } = require('../../domain/incident-creation-rule-override');
const { CheckCreationRulesResult } = require('../../domain/check-creation-rules-result');

class CreationRulesEngine {
  /**
   * Executes rule execution, respecting overrides, subtrees etc.
   * Returns `CheckCreationRulesResult`
   *
   * @param {Object} param
   * @param {IncidentCreationContext} param.context
   * @param {IncidentCreationRule[]} param.creationRules
   * @param {IncidentCreationRuleOverride[] | void} param.ruleOverrides
   * @returns {Promise<CheckCreationRulesResult>}
   */
  async checkCreationRules({ context, creationRules, ruleOverrides = [] }) {
    const skipRuleOverrides = ruleOverrides.filter(
      (ruleOverride) => ruleOverride.action === IncidentCreationRuleOverride.ACTIONS.SKIP
    );
    const decisionHost = await this.recursiveCheckCreationRules({
      context,
      creationRules,
      skipRuleOverrides
    });

    return this.decisionHostToCheckCreationRulesResult(decisionHost);
  }

  /**
   * @private
   * @param {Object} param
   * @param {IncidentCreationContext} param.context
   * @param {IncidentCreationRule[]} param.creationRules
   * @param {IncidentCreationRuleOverride[]} param.skipRuleOverrides
   * @returns {Promise<IncidentCreationDecisionHost>}
   */
  async recursiveCheckCreationRules({ context, creationRules, skipRuleOverrides }) {
    let decisionHost = { decision: IncidentCreationRule.DECISIONS.CONTINUE };

    for (const [creationRuleIndex, creationRule] of creationRules.entries()) {
      const skipCurrent = skipRuleOverrides.some(
        (ruleOverride) => ruleOverride.rule === creationRule.rule
      );

      /**
       * Skip rule execution if explicit override provided
       */
      if (skipCurrent) {
        continue;
      }

      const creationRuleRunResult = await creationRule.run(context);

      /**
       * Should go recursively if subtree was found
       */
      if (Array.isArray(creationRuleRunResult)) {
        decisionHost = await this.recursiveCheckCreationRules({
          context,
          creationRules: creationRuleRunResult,
          skipRuleOverrides
        });
      } else {
        decisionHost = creationRuleRunResult;
      }

      /**
       * Should deny if specified explicitly
       */
      if (decisionHost.decision === IncidentCreationRule.DECISIONS.DENY) {
        return decisionHost;
      }

      /**
       * Should allow if specified explicitly
       * OR the last continued
       */
      if (
        decisionHost.decision === IncidentCreationRule.DECISIONS.ALLOW ||
        (decisionHost.decision === IncidentCreationRule.DECISIONS.CONTINUE &&
          creationRuleIndex === creationRules.length - 1)
      ) {
        return decisionHost;
      }
    }

    return decisionHost;
  }

  /**
   * @private
   * @param {IncidentCreationDecisionHost} decisionHost
   * @returns {CheckCreationRulesResult}
   */
  // eslint-disable-next-line class-methods-use-this
  decisionHostToCheckCreationRulesResult(decisionHost) {
    const result = new CheckCreationRulesResult();

    if (decisionHost.decision === IncidentCreationRule.DECISIONS.DENY) {
      return result.markAsDenied(decisionHost);
    }

    return result.markAsAllowed();
  }
}

module.exports = { CreationRulesEngine };
