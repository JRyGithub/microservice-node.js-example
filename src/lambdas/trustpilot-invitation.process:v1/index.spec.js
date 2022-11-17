/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const { transaction } = require('objection');
const { knex } = require('../../drivers/mysql');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../modules/core/constants/users');
const {
  ConvenientCurrentDateHost
} = require('../../modules/core/adapters/convenient-current-date-host');
const { EnvHost } = require('../../modules/core/adapters/env-host');
const { INCIDENT_ENTITY_TYPES } = require('../../modules/incident/domain/incident');
const {
  TrustpilotInvitation
} = require('../../modules/trustpilot-invitations/domain/trustpilot-invitation');
const { tryToRollback } = require('../../../tests/try-to-rollback');
const { buildEnv } = require('../../../tests/env');
const { compareObjectsProperties } = require('../../../tests/compare-objects-properties');
const { insertIncident } = require('./tests/queries/insert-incident');
const { deleteIncidents } = require('./tests/queries/delete-incidents');
const { buildIncident } = require('./tests/utils/incident');
const { insertTrustpilotInvitation } = require('./tests/queries/insert-trustpilot-invitation');
const {
  findTrustpilotInvitationById
} = require('./tests/queries/find-trustpilot-invitation-by-id');
const { deleteTrustpilotInvitations } = require('./tests/queries/delete-trustpilot-invitations');
const { buildTrustpilotInvitation } = require('./tests/utils/trustpilot-invitation');
const { buildParcel } = require('./tests/utils/parcel');
const { handler } = require('.');

const AXIOS_REFRESH_TOKENS_URL = '/v1/oauth/oauth-business-users-for-applications/refresh';
const AXIOS_RETRIEVE_TOKENS_URL = '/v1/oauth/oauth-business-users-for-applications/accesstoken';
const AXIOS_SEND_INVITATION_URL_REGEX =
  /\/v1\/private\/business-units\/(?<businessUnit>(?:[a-z]|[A-Z]|[0-9])+)\/email-invitations/;

const AXIOS_RESPONSE_TOKEN_DATA = {
  access_token: 'access_token',
  expires_in: '10000',
  issued_at: '10000',
  refresh_token: 'refresh_token',
  refresh_token_expires_in: '10000',
  refresh_token_issued_at: '10000'
};
const AXIOS_REFRESH_TOKEN_RESPONSE = { data: AXIOS_RESPONSE_TOKEN_DATA };
const AXIOS_RETRIEVE_TOKEN_RESPONSE = { data: AXIOS_RESPONSE_TOKEN_DATA };

describe('lambdas/trustpilot-invitation.process:v1', () => {
  let bulkSize;
  let processLimit;
  let shipperId1;
  let invoke;
  let context;
  let trx;
  let parcelRepository;
  let userRepository;
  let currentDate;
  let env;
  let axios;
  let parcelRepositoryFindByIdStub;
  let userRepositoryFindOneByIdStub;
  let axiosPostStub;

  async function callHandler() {
    return handler(
      { data: { processLimit }, invoke, context },
      {
        trxFactory: async () => trx,
        parcelRepository,
        userRepository,
        currentDateHost: new ConvenientCurrentDateHost(currentDate),
        envHost: new EnvHost(env),
        axiosFactory: () => axios
      }
    );
  }

  beforeEach(async () => {
    bulkSize = 1;
    processLimit = 0;
    shipperId1 = '456';
    // eslint-disable-next-line cubyn/transaction
    trx = await transaction.start(knex);
    parcelRepository = {
      findById: () => {}
    };
    userRepository = {
      findOneById: () => {}
    };
    axios = {
      post: () => {}
    };
    parcelRepositoryFindByIdStub = sinon
      .stub(parcelRepository, 'findById')
      .callsFake(({ id }) =>
        buildParcel({ id, shipperId: shipperId1, itTrustedDestination: true })
      );
    userRepositoryFindOneByIdStub = sinon
      .stub(userRepository, 'findOneById')
      .callsFake(async (id) => {
        if (id !== shipperId1) {
          return;
        }

        return { id: shipperId1, salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK };
      });
    axiosPostStub = sinon.stub(axios, 'post').callsFake((url) => {
      if (url === AXIOS_REFRESH_TOKENS_URL) {
        return AXIOS_REFRESH_TOKEN_RESPONSE;
      }

      if (url === AXIOS_RETRIEVE_TOKENS_URL) {
        return AXIOS_RETRIEVE_TOKEN_RESPONSE;
      }
    });
  });

  afterEach(async () => {
    parcelRepositoryFindByIdStub.restore();
    userRepositoryFindOneByIdStub.restore();
    axiosPostStub.restore();
    env = buildEnv();
    await tryToRollback(trx);
  });

  describe('success path', () => {
    describe('when tokens exist', () => {
      describe('when tokens are NOT expired', () => {
        describe('when there are UNFIT_TODO x1, READY_TODO x3, READY_FAILED x3', () => {
          let shipperIdNotPartOfDeliveryNetwork1;

          let cancelParcelId1;
          let cancelParcelId2;
          let cancelParcelId3;
          let cancelParcelId4;
          let unknownParcelId1;

          let incident1;
          let incident2;

          let unfitTodoTI1;
          let readyTodoTIToCancel1;
          let readyTodoTIToCancel2;
          let readyTodoTIToCancel3;
          let readyTodoTIToFailed1;
          let readyTodoTIToFailed2;
          let readyTodoTIToDone1;
          let readyFailedTIToCancel1;
          let readyFailedTIToFailed1;
          let readyFailedTIToDone1;

          async function findProcessedAndUnprocessedInitialFreshEntries() {
            /**
             * @param {TrustpilotInvitation} initial
             * @param {TrustpilotInvitation} fresh
             * @returns {boolean}
             */
            function checkDifferentInitialToFresh(initial, fresh) {
              return (
                !!fresh &&
                initial.id === fresh.id &&
                initial.status === fresh.status &&
                initial.reason === fresh.reason
              );
            }

            const freshReadyTodoTIToCancel1 = await findTrustpilotInvitationById(
              readyTodoTIToCancel1.id
            );
            const freshReadyTodoTIToCancel2 = await findTrustpilotInvitationById(
              readyTodoTIToCancel2.id
            );
            const freshReadyTodoTIToCancel3 = await findTrustpilotInvitationById(
              readyTodoTIToCancel3.id
            );
            const freshReadyTodoTIToFailed1 = await findTrustpilotInvitationById(
              readyTodoTIToFailed1.id
            );
            const freshReadyTodoTIToFailed2 = await findTrustpilotInvitationById(
              readyTodoTIToFailed2.id
            );
            const freshReadyTodoTIToDone1 = await findTrustpilotInvitationById(
              readyTodoTIToDone1.id
            );
            const freshReadyFailedTIToCancel1 = await findTrustpilotInvitationById(
              readyFailedTIToCancel1.id
            );
            const freshReadyFailedTIToFailed1 = await findTrustpilotInvitationById(
              readyFailedTIToFailed1.id
            );
            const freshReadyFailedTIToDone1 = await findTrustpilotInvitationById(
              readyFailedTIToDone1.id
            );

            const initialToFreshTIEntries = [
              [readyTodoTIToCancel1, freshReadyTodoTIToCancel1],
              [readyTodoTIToCancel2, freshReadyTodoTIToCancel2],
              [readyTodoTIToCancel3, freshReadyTodoTIToCancel3],
              [readyTodoTIToFailed1, freshReadyTodoTIToFailed1],
              [readyTodoTIToFailed2, freshReadyTodoTIToFailed2],
              [readyTodoTIToDone1, freshReadyTodoTIToDone1],
              [readyFailedTIToCancel1, freshReadyFailedTIToCancel1],
              [readyFailedTIToFailed1, freshReadyFailedTIToFailed1],
              [readyFailedTIToDone1, freshReadyFailedTIToDone1]
            ];

            /**
             * @type {[TrustpilotInvitation, TrustpilotInvitation | void]}
             */
            const processed = initialToFreshTIEntries.filter(
              ([initial, fresh]) => !checkDifferentInitialToFresh(initial, fresh)
            );

            /**
             * @type {[TrustpilotInvitation, TrustpilotInvitation | void]}
             */
            const unprocessed = initialToFreshTIEntries.filter(([initial, fresh]) =>
              checkDifferentInitialToFresh(initial, fresh)
            );

            return { processed, unprocessed };
          }

          beforeEach(async () => {
            shipperIdNotPartOfDeliveryNetwork1 = 'shipperIdNotPartOfDeliveryNetwork1';

            cancelParcelId1 = 'parcel1';
            cancelParcelId2 = 'parcel2';
            cancelParcelId3 = 'parcel3';
            cancelParcelId4 = 'parcel4';
            unknownParcelId1 = 'unknown';

            currentDate = 5000;
            const trustpilotTodoDelay = 1000;
            env = buildEnv({
              TRUSTPILOT_TODO_DELAY: trustpilotTodoDelay,
              TRUSTPILOT_PROCESS_BULK_SIZE: bulkSize
            });
            const unfitCreatedAtDate = new Date(currentDate - trustpilotTodoDelay + 1000);
            const readyCreatedAtDate = new Date(currentDate - trustpilotTodoDelay - 1000);

            incident1 = await insertIncident(
              buildIncident({
                id: 'incident1',
                entityType: INCIDENT_ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId1
              }),
              trx
            );
            incident2 = await insertIncident(
              buildIncident({
                id: 'incident2',
                entityType: INCIDENT_ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId2
              }),
              trx
            );

            unfitTodoTI1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'unfitTodoTI1',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                createdAt: unfitCreatedAtDate
              }),
              trx
            );
            readyTodoTIToCancel1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToCancel1',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId1,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyTodoTIToCancel2 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToCancel2',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId3,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyTodoTIToCancel3 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToCancel3',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId4,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyTodoTIToFailed1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToFailed1',
                email: 'readyTodoTIToFailed1@test.com',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyTodoTIToFailed2 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToFailed2',
                email: 'readyTodoTIToFailed2@test.com',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
                entityId: unknownParcelId1,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyTodoTIToDone1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyTodoTIToDone1',
                status: TrustpilotInvitation.STATUSES.TO_DO,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyFailedTIToCancel1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyFailedTIToCancel1',
                status: TrustpilotInvitation.STATUSES.FAILED,
                entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
                entityId: cancelParcelId2,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyFailedTIToFailed1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyFailedTIToFailed1',
                email: 'readyFailedTIToFailed1@test.com',
                status: TrustpilotInvitation.STATUSES.FAILED,
                createdAt: readyCreatedAtDate
              }),
              trx
            );
            readyFailedTIToDone1 = await insertTrustpilotInvitation(
              buildTrustpilotInvitation({
                id: 'readyFailedTIToDone1',
                status: TrustpilotInvitation.STATUSES.FAILED,
                createdAt: readyCreatedAtDate
              }),
              trx
            );

            axiosPostStub = axiosPostStub.callsFake((url, data) => {
              if (url === AXIOS_REFRESH_TOKENS_URL) {
                return AXIOS_REFRESH_TOKEN_RESPONSE;
              }

              if (url === AXIOS_RETRIEVE_TOKENS_URL) {
                return AXIOS_RETRIEVE_TOKEN_RESPONSE;
              }

              if (url.match(AXIOS_SEND_INVITATION_URL_REGEX)) {
                if (
                  data.consumerEmail === readyTodoTIToFailed1.email ||
                  data.consumerEmail === readyFailedTIToFailed1.email
                ) {
                  throw new Error('Failed');
                }
              }
            });

            parcelRepositoryFindByIdStub = parcelRepositoryFindByIdStub.callsFake(({ id }) => {
              if (id === unknownParcelId1) {
                return;
              }

              if (id === cancelParcelId3) {
                return buildParcel({
                  id,
                  shipperId: shipperIdNotPartOfDeliveryNetwork1,
                  isTrustedDestination: true
                });
              }

              if (id === cancelParcelId4) {
                return buildParcel({
                  id,
                  shipperId: shipperId1,
                  isTrustedDestination: false
                });
              }

              return buildParcel({
                id,
                shipperId: shipperId1,
                isTrustedDestination: true
              });
            });
            userRepositoryFindOneByIdStub = userRepositoryFindOneByIdStub.callsFake(async (id) => {
              if (id === shipperIdNotPartOfDeliveryNetwork1) {
                return { id, salesCategory: 'ANOTHER' };
              }

              if (id !== shipperId1) {
                return;
              }

              return { id, salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK };
            });
          });

          afterEach(async () => {
            await deleteTrustpilotInvitations([
              unfitTodoTI1,
              readyTodoTIToCancel1,
              readyTodoTIToCancel2,
              readyTodoTIToCancel3,
              readyTodoTIToFailed1,
              readyTodoTIToFailed2,
              readyTodoTIToDone1,
              readyFailedTIToCancel1,
              readyFailedTIToFailed1,
              readyFailedTIToDone1
            ]);

            await deleteIncidents([incident1, incident2]);
          });

          describe('when processLimit = 0', () => {
            beforeEach(async () => callHandler());

            it('should process all existing jobs (expect unfit)', async () => {
              const { processed, unprocessed } =
                await findProcessedAndUnprocessedInitialFreshEntries();

              expect(processed.length).to.equal(9);
              expect(unprocessed.length).to.equal(0);
            });

            it('should NOT make changes to UNFIT TIs', async () => {
              const PROPERTIES_TO_COMPARE = ['id', 'status', 'reason'];

              const freshUnfitTodoTI1 = await findTrustpilotInvitationById(unfitTodoTI1.id);

              expect(
                compareObjectsProperties(freshUnfitTodoTI1, unfitTodoTI1, PROPERTIES_TO_COMPARE)
              ).to.be.true;
            });

            it('should transit cancelled to CANCELLED', async () => {
              const freshReadyTodoTIToCancel1 = await findTrustpilotInvitationById(
                readyTodoTIToCancel1.id
              );
              const freshReadyFailedTIToCancel1 = await findTrustpilotInvitationById(
                readyFailedTIToCancel1.id
              );
              const freshReadyTodoTIToCancel2 = await findTrustpilotInvitationById(
                readyTodoTIToCancel2.id
              );
              const freshReadyTodoTIToCancel3 = await findTrustpilotInvitationById(
                readyTodoTIToCancel3.id
              );

              expect(freshReadyTodoTIToCancel1.id).to.equal(readyTodoTIToCancel1.id);
              expect(freshReadyTodoTIToCancel1.status).to.equal(
                TrustpilotInvitation.STATUSES.CANCELLED
              );
              expect(freshReadyTodoTIToCancel1.reason).to.equal(
                TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS
              );

              expect(freshReadyFailedTIToCancel1.id).to.equal(readyFailedTIToCancel1.id);
              expect(freshReadyFailedTIToCancel1.status).to.equal(
                TrustpilotInvitation.STATUSES.CANCELLED
              );
              expect(freshReadyFailedTIToCancel1.reason).to.equal(
                TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS
              );

              expect(freshReadyTodoTIToCancel2.id).to.equal(readyTodoTIToCancel2.id);
              expect(freshReadyTodoTIToCancel2.status).to.equal(
                TrustpilotInvitation.STATUSES.CANCELLED
              );
              expect(freshReadyTodoTIToCancel2.reason).to.equal(
                TrustpilotInvitation.REASONS.SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK
              );

              expect(freshReadyTodoTIToCancel3.id).to.equal(readyTodoTIToCancel3.id);
              expect(freshReadyTodoTIToCancel3.status).to.equal(
                TrustpilotInvitation.STATUSES.CANCELLED
              );
              expect(freshReadyTodoTIToCancel3.reason).to.equal(
                TrustpilotInvitation.REASONS.PARCEL_DESTINATION_IS_NOT_TRUSTED
              );
            });

            it('should transit failed to FAILED', async () => {
              const freshReadyTodoTIToFailed1 = await findTrustpilotInvitationById(
                readyTodoTIToFailed1.id
              );
              const freshReadyFailedTIToFailed1 = await findTrustpilotInvitationById(
                readyFailedTIToFailed1.id
              );
              const freshReadyTodoTIToFailed2 = await findTrustpilotInvitationById(
                readyTodoTIToFailed2.id
              );

              expect(freshReadyTodoTIToFailed1.id).to.equal(readyTodoTIToFailed1.id);
              expect(freshReadyTodoTIToFailed1.status).to.equal(
                TrustpilotInvitation.STATUSES.FAILED
              );
              expect(freshReadyTodoTIToFailed1.reason).to.equal(
                TrustpilotInvitation.REASONS.ERROR_ON_SEND
              );

              expect(freshReadyFailedTIToFailed1.id).to.equal(readyFailedTIToFailed1.id);
              expect(freshReadyFailedTIToFailed1.status).to.equal(
                TrustpilotInvitation.STATUSES.FAILED
              );
              expect(freshReadyFailedTIToFailed1.reason).to.equal(
                TrustpilotInvitation.REASONS.ERROR_ON_SEND
              );

              expect(freshReadyTodoTIToFailed2.id).to.equal(readyTodoTIToFailed2.id);
              expect(freshReadyTodoTIToFailed2.status).to.equal(
                TrustpilotInvitation.STATUSES.FAILED
              );
              expect(freshReadyTodoTIToFailed2.reason).to.equal(
                TrustpilotInvitation.REASONS.ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT
              );
            });

            it('should transit succeed to DONE', async () => {
              const freshReadyTodoTIToDone1 = await findTrustpilotInvitationById(
                readyTodoTIToDone1.id
              );
              const freshReadyFailedTIToDone1 = await findTrustpilotInvitationById(
                readyFailedTIToDone1.id
              );

              expect(freshReadyTodoTIToDone1.id).to.equal(readyTodoTIToDone1.id);
              expect(freshReadyTodoTIToDone1.status).to.equal(TrustpilotInvitation.STATUSES.DONE);

              expect(freshReadyFailedTIToDone1.id).to.equal(readyFailedTIToDone1.id);
              expect(freshReadyFailedTIToDone1.status).to.equal(TrustpilotInvitation.STATUSES.DONE);
            });

            it('should properly shape the CreateTIDTO', () => {
              const createTIDTOs = axiosPostStub.args
                .filter(([uri]) => uri.match(AXIOS_SEND_INVITATION_URL_REGEX))
                .map(([, dto]) => dto);

              createTIDTOs.forEach((createTIDTO) => {
                expect(createTIDTO).to.have.property('serviceReviewInvitation');
                expect(createTIDTO.serviceReviewInvitation).to.have.property('templateId');
              });
            });
          });

          describe('when processLimit != 0', () => {
            describe('when NO unfit jobs exist', () => {
              beforeEach(async () => {
                await deleteTrustpilotInvitations([unfitTodoTI1], trx);
              });

              describe('when processLimit = 1', () => {
                beforeEach(() => {
                  processLimit = 1;
                });

                it('should process only one tpInvite', async () => {
                  await callHandler();

                  const { processed, unprocessed } =
                    await findProcessedAndUnprocessedInitialFreshEntries();

                  expect(processed.length).to.equal(1);
                  expect(unprocessed.length).to.equal(8);
                });
              });

              describe('when processLimit = 2', () => {
                beforeEach(() => {
                  processLimit = 2;
                });

                it('should process only one tpInvite', async () => {
                  await callHandler();

                  const { processed, unprocessed } =
                    await findProcessedAndUnprocessedInitialFreshEntries();

                  expect(processed.length).to.equal(2);
                  expect(unprocessed.length).to.equal(7);
                });
              });

              describe('when processLimit = 3', () => {
                beforeEach(() => {
                  processLimit = 3;
                });

                it('should process only one tpInvite', async () => {
                  await callHandler();

                  const { processed, unprocessed } =
                    await findProcessedAndUnprocessedInitialFreshEntries();

                  expect(processed.length).to.equal(3);
                  expect(unprocessed.length).to.equal(6);
                });
              });
            });
          });
        });
      });
    });
  });
});
