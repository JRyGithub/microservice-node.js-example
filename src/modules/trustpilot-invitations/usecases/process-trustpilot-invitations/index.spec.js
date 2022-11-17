const { expect } = require('chai');
const sinon = require('sinon');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const {
  InvitationCancelComputationResult
} = require('../../engines/invitation-cancel-computation');
const { InvitationSendResult } = require('../../engines/invitation-send');
const { SendInvitationError } = require('../../errors');
const { MockedLogger } = require('../../../../../tests/logger');
const { ProcessTrustpilotInvitationsUsecase } = require('.');
const {
  TrustpilotInvitationCancelComputationContext
} = require('../../domain/trustpilot-invitation-cancel-computation-context');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');

describe('usecases/process-trustpilot-invitations', () => {
  let bulksCount;
  let processLimit;
  let invitationBulkFetchingEngine;
  let trustpilotInvitationRepository;
  let invitationCancelComputationContextCompositionEngine;
  let invitationCancelComputationEngine;
  let invitationSendEngine;
  let loggerFactory;
  let invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub;
  let invitationCancelComputationContextCompositionEngineComposeManyStub;
  let invitationCancelComputationEngineComputeManyStub;
  let invitationSendEngineSendManyStub;
  let trustpilotInvitationRepositoryTransitManyToDoneStub;
  let trustpilotInvitationRepositoryTransitOneToCancelledStub;
  let trustpilotInvitationRepositoryTransitOneToFailedStub;
  let processTrustpilotInvitationsUsecase;

  beforeEach(() => {
    bulksCount = 4;
    processLimit = 0;
    invitationBulkFetchingEngine = {
      createProcessingAsyncGenerator: () => {}
    };
    trustpilotInvitationRepository = {
      findAllDelayedTodos: () => {},
      findAllFailed: () => {},
      transitManyToDone: () => {},
      transitOneToCancelled: () => {},
      transitOneToFailed: () => {}
    };
    invitationCancelComputationContextCompositionEngine = {
      composeMany: () => {}
    };
    invitationCancelComputationEngine = {
      computeMany: () => {}
    };
    invitationSendEngine = {
      sendMany: () => {}
    };
    loggerFactory = new TransientContextualizedLoggerFactory({
      context: {},
      innerLogger: new MockedLogger()
    });
    processTrustpilotInvitationsUsecase = new ProcessTrustpilotInvitationsUsecase({
      invitationBulkFetchingEngine,
      trustpilotInvitationRepository,
      invitationCancelComputationContextCompositionEngine,
      invitationCancelComputationEngine,
      invitationSendEngine,
      loggerFactory
    });

    invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub = sinon
      .stub(invitationBulkFetchingEngine, 'createProcessingAsyncGenerator')
      // eslint-disable-next-line func-names
      .returns(async function* () {
        yield [];
      });
    invitationCancelComputationContextCompositionEngineComposeManyStub = sinon
      .stub(invitationCancelComputationContextCompositionEngine, 'composeMany')
      .callsFake(async ({ trustpilotInvitations }) => ({
        succeed: trustpilotInvitations.map(
          (tpInvite) =>
            new TrustpilotInvitationCancelComputationContext({
              trustpilotInvitation: tpInvite,
              parcel: { id: '123', shipperId: '456' },
              shipper: {
                id: '456',
                salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK
              }
            })
        ),
        errorHosts: []
      }));
  });

  afterEach(() => {
    invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub.restore();
    invitationCancelComputationContextCompositionEngineComposeManyStub.restore();
  });

  describe('when everything is OK', () => {
    let delayedTIToCancelled1;
    let failedTIToCancelled1;
    let failedTIToFail1;
    let delayedTIToFailed2;
    let failedTIToFailed2;

    beforeEach(() => {
      delayedTIToCancelled1 = createTrustpilotInvitation({
        id: 3,
        entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
        entityId: '3'
      });
      failedTIToCancelled1 = createTrustpilotInvitation({
        id: 6,
        entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
        entityId: '6',
        status: TrustpilotInvitation.STATUSES.FAILED
      });
      failedTIToFail1 = createTrustpilotInvitation({
        id: 7,
        entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
        entityId: '7',
        status: TrustpilotInvitation.STATUSES.FAILED
      });
      delayedTIToFailed2 = createTrustpilotInvitation({
        id: 8,
        entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
        entityId: '8'
      });
      failedTIToFailed2 = createTrustpilotInvitation({
        id: 9,
        entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
        entityId: '9',
        status: TrustpilotInvitation.STATUSES.FAILED
      });

      invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub =
        // eslint-disable-next-line func-names
        invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub.returns(async function* () {
          yield [delayedTIToCancelled1];

          yield [failedTIToCancelled1];

          yield [failedTIToFail1, delayedTIToFailed2];

          yield [failedTIToFailed2];

          yield [];
        });

      invitationCancelComputationContextCompositionEngineComposeManyStub =
        invitationCancelComputationContextCompositionEngineComposeManyStub.callsFake(
          async ({ trustpilotInvitations }) => {
            return trustpilotInvitations.reduce(
              (acc, trustpilotInvitation) => {
                if ([delayedTIToFailed2, failedTIToFailed2].includes(trustpilotInvitation)) {
                  acc.errorHosts.push({
                    trustpilotInvitation,
                    error: new Error()
                  });
                } else {
                  acc.succeed.push(
                    new TrustpilotInvitationCancelComputationContext({
                      trustpilotInvitation,
                      parcel: { id: '123', shipperId: '456' },
                      shipper: {
                        id: '456',
                        salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK
                      }
                    })
                  );
                }

                return acc;
              },
              { succeed: [], errorHosts: [] }
            );
          }
        );

      invitationCancelComputationEngineComputeManyStub = sinon
        .stub(invitationCancelComputationEngine, 'computeMany')
        .callsFake((contexts) => {
          return contexts.reduce(
            (acc, context) => {
              if ([failedTIToFail1].includes(context.trustpilotInvitation)) {
                acc.confirmed.push(
                  new InvitationCancelComputationResult(context).markAsConfirmed()
                );
              }
              if (
                [delayedTIToCancelled1, failedTIToCancelled1].includes(context.trustpilotInvitation)
              ) {
                acc.cancelled.push(
                  new InvitationCancelComputationResult(context).markAsCancelled(
                    TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS
                  )
                );
              }

              return acc;
            },
            { confirmed: [], cancelled: [] }
          );
        });

      invitationSendEngineSendManyStub = sinon
        .stub(invitationSendEngine, 'sendMany')
        .callsFake((contexts) => {
          return contexts.reduce(
            (acc, context) => {
              if ([failedTIToFail1].includes(context.trustpilotInvitation)) {
                acc.failed.push(
                  new InvitationSendResult(context).markAsFailed(
                    new SendInvitationError(new Error())
                  )
                );
              }

              return acc;
            },
            { succeed: [], failed: [] }
          );
        });

      trustpilotInvitationRepositoryTransitManyToDoneStub = sinon
        .stub(trustpilotInvitationRepository, 'transitManyToDone')
        .resolves();

      trustpilotInvitationRepositoryTransitOneToCancelledStub = sinon
        .stub(trustpilotInvitationRepository, 'transitOneToCancelled')
        .resolves();

      trustpilotInvitationRepositoryTransitOneToFailedStub = sinon
        .stub(trustpilotInvitationRepository, 'transitOneToFailed')
        .resolves();
    });

    beforeEach(async () => {
      await processTrustpilotInvitationsUsecase.execute({ processLimit });
    });

    it('should create and call bulkAsyncGenerator', () => {
      expect(
        invitationBulkFetchingEngineCreateProcessingAsyncGeneratorStub
      ).to.have.been.calledOnceWith({ processLimit });
    });

    it('should perform cancel computation', () => {
      expect(invitationCancelComputationEngineComputeManyStub).to.have.callCount(bulksCount + 1);
    });

    it('should send invitations for confirmed TIs', () => {
      expect(invitationSendEngineSendManyStub).to.have.callCount(bulksCount + 1);
      expect(
        invitationSendEngineSendManyStub.args.every((args) =>
          [failedTIToFail1].includes(args[0].trustpilotInvitation)
        )
      );
    });

    it('should transit succeed to DONE', () => {
      expect(trustpilotInvitationRepositoryTransitManyToDoneStub).to.have.callCount(bulksCount + 1);
    });

    it('should transit cancelled to CANCEL with reason', () => {
      expect(trustpilotInvitationRepositoryTransitOneToCancelledStub).to.have.callCount(2);
      expect(
        trustpilotInvitationRepositoryTransitOneToCancelledStub.args.every((args) =>
          [delayedTIToCancelled1, failedTIToCancelled1].includes(args[0].trustpilotInvitation)
        )
      );
    });

    it('should transit failed to FAILED with error', () => {
      expect(trustpilotInvitationRepositoryTransitOneToFailedStub).to.have.callCount(3);
      expect(
        trustpilotInvitationRepositoryTransitOneToFailedStub.args.every((args) =>
          [failedTIToFail1, delayedTIToFailed2, failedTIToFailed2].includes(
            args[0].trustpilotInvitation
          )
        )
      );
    });
  });
});
