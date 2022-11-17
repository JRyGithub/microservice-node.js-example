/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const { EnvHost } = require('../../../core/adapters/env-host');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const { MockedLogger } = require('../../../../../tests/logger');
const { buildEnv } = require('../../../../../tests/env');
const { InvitationBulkFetchingEngine } = require('.');

describe('engines/invitation-bulk-fetching', () => {
  let bulkSize;
  let processLimit;
  let trustpilotInvitation;
  let trustpilotInvitationRepository;
  let loggerFactory;
  let trustpilotInvitationRepositoryFindAllProcessingIdsStub;
  let trustpilotInvitationRepositoryFindManyByIdsStub;
  let error;

  function instantiate() {
    const env = buildEnv({ TRUSTPILOT_PROCESS_BULK_SIZE: bulkSize });
    const envHost = new EnvHost(env);

    return new InvitationBulkFetchingEngine({
      trustpilotInvitationRepository,
      envHost,
      loggerFactory
    });
  }

  beforeEach(() => {
    bulkSize = 1;
    processLimit = 0;
    trustpilotInvitation = createTrustpilotInvitation({
      entityId: '123',
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL
    });
    trustpilotInvitationRepository = {
      findAllProcessingIds: () => {},
      findManyByIds: () => {}
    };
    loggerFactory = new TransientContextualizedLoggerFactory({
      context: {},
      innerLogger: new MockedLogger()
    });
    trustpilotInvitationRepositoryFindAllProcessingIdsStub = sinon
      .stub(trustpilotInvitationRepository, 'findAllProcessingIds')
      .resolves([]);
    trustpilotInvitationRepositoryFindManyByIdsStub = sinon
      .stub(trustpilotInvitationRepository, 'findManyByIds')
      .resolves([]);
    error = undefined;
  });

  afterEach(() => {
    trustpilotInvitationRepositoryFindAllProcessingIdsStub.restore();
    trustpilotInvitationRepositoryFindManyByIdsStub.restore();
  });

  describe('#createProcessingAsyncGenerator()', () => {
    async function call() {
      try {
        const asyncGenerator = await instantiate().createProcessingAsyncGenerator({
          processLimit
        });

        // eslint-disable-next-line semi
        for await (const bulk of asyncGenerator()) {
        }
      } catch (innerError) {
        error = innerError;
      }
    }

    describe('when there are NO ids', () => {
      beforeEach(() => {
        trustpilotInvitationRepositoryFindAllProcessingIdsStub.resolves([]);
      });

      it('should NOT try to fetch bulks', async () => {
        await call();

        expect(trustpilotInvitationRepositoryFindAllProcessingIdsStub).to.have.been.calledOnce;
        expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.not.have.been.called;
      });
    });

    describe('when there is only one id', () => {
      beforeEach(() => {
        trustpilotInvitationRepositoryFindAllProcessingIdsStub =
          trustpilotInvitationRepositoryFindAllProcessingIdsStub.resolves([1]);
        trustpilotInvitationRepositoryFindManyByIdsStub =
          trustpilotInvitationRepositoryFindManyByIdsStub.resolves([trustpilotInvitation]);
      });

      it('should try to fetch once and finish', async () => {
        await call();

        expect(trustpilotInvitationRepositoryFindAllProcessingIdsStub).to.have.been.calledOnceWith(
          processLimit
        );
        expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledOnceWith([1]);
      });
    });

    describe('when there are two ids', () => {
      describe('when bulkSize = 1', () => {
        beforeEach(() => {
          bulkSize = 1;

          trustpilotInvitationRepositoryFindAllProcessingIdsStub =
            trustpilotInvitationRepositoryFindAllProcessingIdsStub.resolves([1, 2, 3]);
          trustpilotInvitationRepositoryFindManyByIdsStub =
            trustpilotInvitationRepositoryFindManyByIdsStub
              .onFirstCall()
              .resolves([trustpilotInvitation])
              .onSecondCall()
              .resolves([trustpilotInvitation])
              .onThirdCall()
              .resolves([trustpilotInvitation]);
        });

        it('should try to fetch thrice and finish', async () => {
          await call();

          expect(
            trustpilotInvitationRepositoryFindAllProcessingIdsStub
          ).to.have.been.calledOnceWith(processLimit);
          expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledWith([1]);
          expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledWith([2]);
          expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledWith([3]);
        });
      });

      describe('when bulkSize = 2', () => {
        beforeEach(() => {
          bulkSize = 2;

          trustpilotInvitationRepositoryFindAllProcessingIdsStub =
            trustpilotInvitationRepositoryFindAllProcessingIdsStub.resolves([1, 2, 3]);
          trustpilotInvitationRepositoryFindManyByIdsStub =
            trustpilotInvitationRepositoryFindManyByIdsStub
              .onFirstCall()
              .resolves([trustpilotInvitation, trustpilotInvitation])
              .onSecondCall()
              .resolves([trustpilotInvitation]);
        });

        it('should try to fetch twice and finish', async () => {
          await call();

          expect(
            trustpilotInvitationRepositoryFindAllProcessingIdsStub
          ).to.have.been.calledOnceWith(processLimit);
          expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledWith([1, 2]);
          expect(trustpilotInvitationRepositoryFindManyByIdsStub).to.have.been.calledWith([3]);
        });
      });
    });
  });
});
