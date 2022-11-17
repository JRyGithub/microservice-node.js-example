/* eslint-disable max-len */
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');
const {
  TrustpilotInvitationSendContext
} = require('../../domain/trustpilot-invitation-send-context');
// eslint-disable-next-line no-unused-vars
const { InvitationBulkFetchingEngine } = require('../../engines/invitation-bulk-fetching');
const {
  // eslint-disable-next-line no-unused-vars
  InvitationCancelComputationEngine
} = require('../../engines/invitation-cancel-computation');
const {
  // eslint-disable-next-line no-unused-vars
  InvitationSendEngine
} = require('../../engines/invitation-send');

/**
 * Processes invitations with `TO_DO` status.
 * Performs cancel result computation,
 * transits invitations, sends invitations
 */
class ProcessTrustpilotInvitationsUsecase {
  /**
   *
   * @param {Object} param
   * @param {InvitationBulkFetchingEngine} param.invitationBulkFetchingEngine
   * @param {TrustpilotInvitationRepository} param.trustpilotInvitationRepository
   * @param {InvitationCancelComputationContextCompositionEngine} param.invitationCancelComputationContextCompositionEngine
   * @param {InvitationCancelComputationEngine} param.invitationCancelComputationEngine
   * @param {InvitationSendEngine} param.invitationSendEngine
   * @param {TransientLoggerFactory} param.loggerFactory
   */
  constructor({
    invitationBulkFetchingEngine,
    trustpilotInvitationRepository,
    invitationCancelComputationContextCompositionEngine,
    invitationCancelComputationEngine,
    invitationSendEngine,
    loggerFactory
  }) {
    this.invitationBulkFetchingEngine = invitationBulkFetchingEngine;
    this.trustpilotInvitationRepository = trustpilotInvitationRepository;
    this.invitationCancelComputationContextCompositionEngine =
      invitationCancelComputationContextCompositionEngine;
    this.invitationCancelComputationEngine = invitationCancelComputationEngine;
    this.invitationSendEngine = invitationSendEngine;
    /**
     * @private
     */
    this.logger = loggerFactory.create('ProcessTrustpilotInvitationsUsecase');
  }

  /**
   * @param {Object} param
   * @param {number | void} param.processLimit
   * @returns {Promise<void>}
   */
  async execute({ processLimit = 0 }) {
    const bulkAsyncGenerator = this.invitationBulkFetchingEngine.createProcessingAsyncGenerator({
      processLimit
    });

    // eslint-disable-next-line
    for await (const trustpilotInvitations of bulkAsyncGenerator()) {
      await this.process(trustpilotInvitations);
    }
  }

  /**
   * @private
   *
   * @param {TrustpilotInvitation[]} trustpilotInvitations
   */
  async process(trustpilotInvitations) {
    const {
      succeed: succeedCancelComputationContexts,
      errorHosts: cancelComputationContextErrorHosts
    } = await this.invitationCancelComputationContextCompositionEngine.composeMany({
      trustpilotInvitations
    });

    const { confirmed, cancelled } = await this.invitationCancelComputationEngine.computeMany(
      succeedCancelComputationContexts
    );
    this.logger.debug(
      `Invitation cancel computation results: ${confirmed.length} CONFIRMED, ${cancelled.length} CANCELLED`
    );

    const { succeed, failed } = await this.invitationSendEngine.sendMany(
      confirmed.map(({ context }) => new TrustpilotInvitationSendContext({ ...context }))
    );
    this.logger.debug(
      `Invitation send results: ${succeed.length} SUCCEED, ${failed.length} FAILED`
    );

    const transitManyToDonePromise = this.trustpilotInvitationRepository.transitManyToDone(
      succeed.map(({ context }) => context.trustpilotInvitation)
    );
    const transitOneToCancelledPromises = Promise.all(
      cancelled.map(async ({ context, reason }) =>
        this.trustpilotInvitationRepository.transitOneToCancelled(
          context.trustpilotInvitation,
          reason
        )
      )
    );
    const transitOneToFailedPromises = Promise.all([
      ...failed.map(async ({ context, error }) =>
        this.trustpilotInvitationRepository.transitOneToFailed(context.trustpilotInvitation, error)
      ),
      ...cancelComputationContextErrorHosts.map(async ({ trustpilotInvitation, error }) =>
        this.trustpilotInvitationRepository.transitOneToFailed(
          trustpilotInvitation,
          error,
          TrustpilotInvitation.REASONS.ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT
        )
      )
    ]);

    await Promise.all([
      transitManyToDonePromise,
      transitOneToCancelledPromises,
      transitOneToFailedPromises
    ]);
  }
}

module.exports = { ProcessTrustpilotInvitationsUsecase };
