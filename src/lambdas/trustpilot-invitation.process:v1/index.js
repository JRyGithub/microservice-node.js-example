const schemaUtils = require('carotte-schema-utils');
const { transaction } = require('objection');
const Axios = require('axios').default;
const env = require('../../env');
const { knex } = require('../../drivers/mysql');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const {
  ConvenientCurrentDateHost
} = require('../../modules/core/adapters/convenient-current-date-host');
const { EnvHost } = require('../../modules/core/adapters/env-host');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const {
  RpcUserRepository
} = require('../../modules/trustpilot-invitations/adapters/rpc-user-repository');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const {
  SqlRequesterRepository
} = require('../../modules/incident/adapters/sql-requester-repository');
const {
  SqlTrustpilotInvitationRepository
} = require('../../modules/trustpilot-invitations/adapters/sql-trustpilot-invitation-repository');
const {
  SqlTrustpilotTokenRepository
} = require('../../modules/trustpilot-invitations/adapters/sql-trustpilot-token-repository');
const {
  TrustpilotAxiosClient
} = require('../../modules/trustpilot-invitations/adapters/trustpilot-axios-client');
const {
  TrustpilotClient
} = require('../../modules/trustpilot-invitations/adapters/trustpilot-client');
const {
  TrustpilotTokenStorage
} = require('../../modules/trustpilot-invitations/adapters/trustpilot-token-storage');
const {
  ParcelResolveEngine
} = require('../../modules/trustpilot-invitations/engines/parcel-resolve');
const {
  IncidentResolveEngine
} = require('../../modules/trustpilot-invitations/engines/incident-resolve');
const {
  InvitationBulkFetchingEngine
} = require('../../modules/trustpilot-invitations/engines/invitation-bulk-fetching');
const {
  InvitationCancelComputationContextCompositionEngine
} = require('../../modules/trustpilot-invitations/engines/invitation-cancel-computation-context-composition');
const {
  InvitationCancelComputationEngine
} = require('../../modules/trustpilot-invitations/engines/invitation-cancel-computation');
const {
  InvitationSendEngine
} = require('../../modules/trustpilot-invitations/engines/invitation-send');
const {
  ProcessTrustpilotInvitationsUsecase
} = require('../../modules/trustpilot-invitations/usecases/process-trustpilot-invitations');
const {
  RpcApplicationRepository
} = require('../../modules/trustpilot-invitations/adapters/rpc-application-class-repository');

async function handler(
  { data: { processLimit = 0 }, invoke, context },
  {
    // eslint-disable-next-line cubyn/transaction
    trxFactory = async () => transaction.start(knex),
    parcelRepository = new RpcParcelRepository(invoke),
    userRepository = new RpcUserRepository(invoke),
    applicationRepository = new RpcApplicationRepository(invoke),
    currentDateHost = new ConvenientCurrentDateHost(),
    envHost = new EnvHost(env),
    axiosFactory = () => Axios.create()
  } = {}
) {
  const trx = await trxFactory();

  try {
    const loggerFactory = new TransientContextualizedLoggerFactory({
      context,
      innerLogger: globalLogger
    });

    const incidentRepository = new SqlIncidentRepository(trx);
    const incidentRequesterRepository = new SqlRequesterRepository(trx);
    const trustpilotInvitationRepository = new SqlTrustpilotInvitationRepository(
      trx,
      currentDateHost,
      envHost
    );
    const trustpilotTokenRepository = new SqlTrustpilotTokenRepository(
      trx,
      envHost.get().TRUSTPILOT_TOKENS_HOST_ID
    );

    const axios = axiosFactory();

    const trustpilotTokenStorage = new TrustpilotTokenStorage({
      trustpilotTokenRepository,
      currentDateHost,
      loggerFactory
    });
    const trustpilotAxiosClient = new TrustpilotAxiosClient({
      trustpilotTokenStorage,
      axios,
      envHost,
      loggerFactory
    });
    const trustpilotClient = new TrustpilotClient({
      trustpilotAxiosClient,
      envHost
    });

    const parcelResolveEngine = new ParcelResolveEngine({
      incidentRepository,
      parcelRepository
    });
    const incidentResolveEngine = new IncidentResolveEngine({ incidentRepository });
    const invitationBulkFetchingEngine = new InvitationBulkFetchingEngine({
      trustpilotInvitationRepository,
      envHost,
      loggerFactory
    });
    const invitationCancelComputationContextCompositionEngine =
      new InvitationCancelComputationContextCompositionEngine({
        parcelResolveEngine,
        incidentResolveEngine,
        userRepository,
        incidentRequesterRepository
      });
    const invitationCancelComputationEngine = new InvitationCancelComputationEngine({
      incidentRepository
    });
    const invitationSendEngine = new InvitationSendEngine({
      trustpilotClient,
      envHost,
      applicationRepository
    });

    const processTrustpilotInvitationsUsecase = new ProcessTrustpilotInvitationsUsecase({
      invitationBulkFetchingEngine,
      trustpilotInvitationRepository,
      invitationCancelComputationContextCompositionEngine,
      invitationCancelComputationEngine,
      invitationSendEngine,
      loggerFactory
    });

    await processTrustpilotInvitationsUsecase.execute({ processLimit });

    await trx.commit();
  } catch (error) {
    await trx.rollback();

    throw error;
  }
}

const meta = {
  description: 'Processes trustpilot invitations. Should be triggered by cron',
  requestSchema: schemaUtils.object('Request', {
    properties: {
      processLimit: schemaUtils.number('Process limit')
    }
  }),
  responseSchema: {}
};

module.exports = { handler, meta };
