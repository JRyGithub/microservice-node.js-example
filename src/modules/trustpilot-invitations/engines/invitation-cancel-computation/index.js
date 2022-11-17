/* eslint-disable max-classes-per-file */
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation/abstract');
const {
  TrustpilotInvitationOfTypeParcel
} = require('../../domain/trustpilot-invitation/of-type-parcel');
const {
  // eslint-disable-next-line no-unused-vars
  TrustpilotInvitationCancelComputationContext
} = require('../../domain/trustpilot-invitation-cancel-computation-context');
const { UnknownTrustpilotInvitationEntityType } = require('../../errors');

class InvitationCancelComputationResult {
  /**
   * @param {TrustpilotInvitationCancelComputationContext} context
   */
  constructor(context) {
    /**
     * @type {TrustpilotInvitationCancelComputationContext}
     */
    this.context = context;
  }

  /**
   * @param {string | void} reason
   *
   * @returns {this}
   */
  markAsCancelled(reason) {
    this.cancel = true;
    this.reason = reason;

    return this;
  }

  /**
   * @returns {this}
   */
  markAsConfirmed() {
    this.cancel = false;

    return this;
  }
}

class InvitationCancelComputationEngine {
  /**
   * @param {Object} param
   * @param {IncidentRepository} param.incidentRepository
   */
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  /**
   * @param {TrustpilotInvitationCancelComputationContext[]} contexts
   * @returns {Promise<{
   *  confirmed: InvitationCancelComputationResult[];
   *  cancelled: InvitationCancelComputationResult[];
   * }>}
   */
  async computeMany(contexts) {
    /**
     * @type {InvitationCancelComputationResult[]}
     */
    const confirmed = [];
    /**
     * @type {InvitationCancelComputationResult[]}
     */
    const cancelled = [];

    await Promise.all(
      contexts.map(async (context) => {
        const result = await this.compute(context);

        if (!result.cancel) {
          confirmed.push(result);
        } else {
          cancelled.push(result);
        }
      })
    );

    return { confirmed, cancelled };
  }

  /**
   * @param {TrustpilotInvitationCancelComputationContext} context
   * @returns {Promise<InvitationCancelComputationResult>}
   */
  async compute(context) {
    if (context.shipper.salesCategory !== USER_SALES_CATEGORY_DELIVERY_NETWORK) {
      return new InvitationCancelComputationResult(context).markAsCancelled(
        TrustpilotInvitation.REASONS.SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK
      );
    }

    if (!context.parcel.isTrustedDestination) {
      return new InvitationCancelComputationResult(context).markAsCancelled(
        TrustpilotInvitation.REASONS.PARCEL_DESTINATION_IS_NOT_TRUSTED
      );
    }

    if (context.trustpilotInvitation instanceof TrustpilotInvitationOfTypeParcel) {
      return this.computeOfTypeParcel(context);
    }

    throw new UnknownTrustpilotInvitationEntityType(context.trustpilotInvitation);
  }

  /**
   * @private
   * @param {TrustpilotInvitationCancelComputationContext} context
   * @returns {Promise<InvitationCancelComputationResult>}
   */
  async computeOfTypeParcel(context) {
    const result = new InvitationCancelComputationResult(context);

    const foundIncident = await this.incidentRepository.findByParcelId(
      context.trustpilotInvitation.entityId
    );

    if (foundIncident) {
      return result.markAsCancelled(TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS);
    }

    return result.markAsConfirmed();
  }
}

module.exports = { InvitationCancelComputationResult, InvitationCancelComputationEngine };
