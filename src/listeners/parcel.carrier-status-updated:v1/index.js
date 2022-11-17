const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');

const { knex } = require('../../drivers/mysql');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const {
  TrustpilotInvitation
} = require('../../modules/trustpilot-invitations/domain/trustpilot-invitation');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const {
  RpcUserRepository
} = require('../../modules/trustpilot-invitations/adapters/rpc-user-repository');
const {
  SqlTrustpilotInvitationRepository
} = require('../../modules/trustpilot-invitations/adapters/sql-trustpilot-invitation-repository');
const {
  ParcelResolveEngine
} = require('../../modules/trustpilot-invitations/engines/parcel-resolve');
const {
  CreateTrustpilotInvitationUsecase
} = require('../../modules/trustpilot-invitations/usecases/create-trustpilot-invitation');
const {
  TrustpilotInvitationCreationError
} = require('../../modules/trustpilot-invitations/errors');
const { EnvHost } = require('../../modules/core/adapters/env-host');
const env = require('../../env');

async function handler(
  { data: { id, status }, invoke, context },
  {
    // eslint-disable-next-line cubyn/transaction
    trxFactory = async () => transaction.start(knex),
    parcelRepository = new RpcParcelRepository(invoke),
    userRepository = new RpcUserRepository(invoke),
    envHost = new EnvHost(env)
  } = {}
) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });

  const logger = loggerFactory.create('listeners/parcel.carrier-status-updated:v1');

  const trx = await trxFactory();

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const trustpilotInvitationRepository = new SqlTrustpilotInvitationRepository(trx);

    const parcelResolveEngine = new ParcelResolveEngine({
      incidentRepository,
      parcelRepository
    });

    const createTrustpilotInvitationUsecase = new CreateTrustpilotInvitationUsecase({
      trustpilotInvitationRepository,
      userRepository,
      parcelResolveEngine,
      envHost
    });

    await createTrustpilotInvitationUsecase.execute({
      entityId: id,
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
      partialEntity: { id, status }
    });

    await trx.commit();
  } catch (error) {
    await trx.rollback();

    if (error instanceof TrustpilotInvitationCreationError) {
      const { reason } = error;
      logger.info(`Failed to create trustpilot invitation on parcel delivered event (${reason})`, {
        error,
        context
      });

      return;
    }

    logger.error('Failed to create trustpilot invitation', { error, context });

    throw error;
  }
}

const meta = {
  description: 'Create trustpilot invitation on parcel delivery',
  requestSchema: schemaUtils.object('Request (parcel)', {
    required: ['incident'],
    properties: {
      status: schemaUtils.string('Status')
    }
  }),
  responseSchema: {}
};

module.exports = { handler, meta };
