/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
const { DECISIONS, RULES } = require('./constants');

/**
 * @abstract
 */
class IncidentCreationRule {
  /**
   * @param {Object} param
   * @param {IncidentCreationRuleRule} param.rule
   */
  constructor({ rule }) {
    /**
     * @readonly
     * @type {IncidentCreationRuleRule}
     */
    this.rule = rule;

    /**
     * @type {any}
     */
    this.details = null;

    /**
     * @protected
     * @type {IncidentCreationDecisionHost | IncidentCreationRule[]}
     */
    this._onTrue = { decision: IncidentCreationRule.DECISIONS.CONTINUE };

    /**
     * @protected
     * @type {IncidentCreationDecisionHost | IncidentCreationRule[]}
     */
    this._onFalse = { decision: IncidentCreationRule.DECISIONS.CONTINUE };
  }

  static get DECISIONS() {
    return DECISIONS;
  }

  static get RULES() {
    return RULES;
  }

  /**
   * @abstract
   * @protected
   * @param {IncidentCreationContext} context
   * @returns {Promise<IncidentCreationPredicate> | IncidentCreationPredicate}
   */
  // eslint-disable-next-line class-methods-use-this
  predicateFactory() {
    throw new Error('Not implemented');
  }

  /**
   * @param {IncidentCreationDecision | IncidentCreationRule[]} decisionOrRules
   * @param {IncidentCreationDeniedError | void} error
   */
  onTrue(decisionOrRules, error) {
    if (Array.isArray(decisionOrRules)) {
      this._onTrue = decisionOrRules;
    } else {
      this._onTrue = { decision: decisionOrRules, error };
    }

    return this;
  }

  /**
   * @param {IncidentCreationDecision | IncidentCreationRule[]} decisionOrRules
   * @param {IncidentCreationDeniedError | void} error
   */
  onFalse(decisionOrRules, error) {
    if (Array.isArray(decisionOrRules)) {
      this._onFalse = decisionOrRules;
    } else {
      this._onFalse = { decision: decisionOrRules, error };
    }

    return this;
  }

  /**
   * @param {IncidentCreationContext} context
   * @returns {Promise<IncidentCreationDecisionHost | IncidentCreationRule[]>}
   */
  async run(context) {
    const predicate = await this.predicateFactory(context);
    const predicateResult = await predicate();

    if (!predicateResult) {
      return this._onFalse;
    }

    return this._onTrue;
  }
}

/**
 * TODO: update if needed
 * @typedef {Object} IncidentCreationContext
 * @property {Parcel} parcel
 * @property {Incident[] | void} similarIncidents
 * @property {DeliveryPromise} deliveryPromise
 * @property {Date} currentDate
 */

/**
 * @typedef {() => Promise<boolean> | boolean} IncidentCreationPredicate
 */

/**
 * @typedef {keyof IncidentCreationRule.DECISIONS} IncidentCreationDecision
 */

/**
 * @typedef {keyof IncidentCreationRule.RULES} IncidentCreationRuleRule
 */

/**
 * @typedef {Object} IncidentCreationDecisionHost
 * @property {IncidentCreationDecision} decision
 * @property {IncidentCreationDeniedError | void} error
 */

module.exports = { IncidentCreationRule };
