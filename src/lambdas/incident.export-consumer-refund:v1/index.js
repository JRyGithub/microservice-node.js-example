const { transaction } = require('objection');
const { EnvHost } = require('../../modules/core/adapters/env-host');
const env = require('../../env');
const IncidentModel = require('../../modules/models/incident');
const {
  ExportConsumerRefundList
} = require('../../modules/incident/usecases/send-consumer-refund');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');
const {
  RpcWarehouseRepository
} = require('../../modules/incident/adapters/rpc-warehouse-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { USER_TYPES, RESOLUTION_TYPES } = require('../../modules/incident/domain/incident/base');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const logger = require('../../drivers/logger');

async function handler(
  { invoke, context },
  {
    envHost = new EnvHost(env),
    messagingRepository = new RpcMessageRepository(invoke),
    warehouseRepository = new RpcWarehouseRepository(invoke),
    parcelRepository = new RpcParcelRepository(invoke)
  } = {}
) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });

  let docs = [];
  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const exportConsumerRefunds = new ExportConsumerRefundList(
      {
        incidentRepository,
        messagingRepository,
        warehouseRepository,
        parcelRepository,
        envHost,
        loggerFactory
      },
      {
        refundNotGenerated: true,
        resolutionTypeApplied: RESOLUTION_TYPES.REFUND,
        source: USER_TYPES.RECIPIENT
      }
    );

    docs = await exportConsumerRefunds.execute();
    await trx.commit();
    // eslint-disable-next-line no-useless-catch
    await Promise.all(docs.map((doc) => doc.sendToHeadOffice()));

    return {};
  } catch (error) {
    await trx.rollback();
    logger.error('Export consumer refund failed', { error, context });
    throw error;
  }
}

module.exports = {
  handler,
  options: { prefetch: 1 },
  meta: {
    description: 'Generate and send refunds to head office',
    requestSchema: {
      type: 'object',
      properties: {}
    },
    responseSchema: {
      type: 'object',
      properties: {}
    }
  }
};
