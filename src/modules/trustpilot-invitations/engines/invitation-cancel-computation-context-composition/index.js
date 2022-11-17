const { assert, ResourceNotFoundError } = require('@devcubyn/core.errors');
const {
  TrustpilotInvitationCancelComputationContext
} = require('../../domain/trustpilot-invitation-cancel-computation-context');

/* eslint-disable max-len */
class InvitationCancelComputationContextCompositionEngine {
  /**
   * @param {Object} param
   * @param {ParcelResolveEngine} param.parcelResolveEngine
   * @param {IncidentResolveEngine} param.incidentResolveEngine
   * @param {UserRepository} param.userRepository
   * @param {IncidentRequesterRepository} param.incidentRequesterRepository
   */
  constructor({
    parcelResolveEngine,
    incidentResolveEngine,
    userRepository,
    incidentRequesterRepository
  }) {
    this.parcelResolveEngine = parcelResolveEngine;
    this.incidentResolveEngine = incidentResolveEngine;
    this.userRepository = userRepository;
    this.incidentRequesterRepository = incidentRequesterRepository;
  }

  /**
   * @param {Object} param
   * @param {import('../../domain/trustpilot-invitation').TrustpilotInvitation[]} param.trustpilotInvitations
   * @returns {Promise<{
   *  succeed: TrustpilotInvitationCancelComputationContext[],
   *  errorHosts: Error[]
   * }>}
   */
  async composeMany({ trustpilotInvitations }) {
    const succeed = [];
    const errorHosts = [];

    await Promise.all(
      trustpilotInvitations.map(async (trustpilotInvitation) => {
        try {
          const result = await this.compose({ trustpilotInvitation });

          succeed.push(result);
        } catch (error) {
          errorHosts.push({ trustpilotInvitation, error });
        }
      })
    );

    return { succeed, errorHosts };
  }

  /**
   * @param {Object} param
   * @param {import('../../domain/trustpilot-invitation').TrustpilotInvitation} param.trustpilotInvitation
   * @returns {Promise<TrustpilotInvitationCancelComputationContext>}
   */
  async compose({ trustpilotInvitation }) {
    const parcel = await this.parcelResolveEngine.resolve({
      entityId: trustpilotInvitation.entityId,
      entityType: trustpilotInvitation.entityType
    });
    assert(parcel, ResourceNotFoundError, 'Parcel');
    assert(parcel.shipperId, ResourceNotFoundError, 'ShipperId', parcel.shipperId);

    const shipper = await this.userRepository.findOneById(parcel.shipperId);
    assert(shipper, ResourceNotFoundError, 'Shipper', parcel.shipperId);

    const foundIncident = await this.incidentResolveEngine.resolve({
      entityId: trustpilotInvitation.entityId,
      entityType: trustpilotInvitation.entityType
    });
    let incidentRequester;

    if (foundIncident && foundIncident.isRecipientSource()) {
      incidentRequester = await this.incidentRequesterRepository.findById(foundIncident.ownerId);
    }

    return new TrustpilotInvitationCancelComputationContext({
      trustpilotInvitation,
      parcel,
      shipper,
      incidentRequester
    });
  }
}

module.exports = { InvitationCancelComputationContextCompositionEngine };
