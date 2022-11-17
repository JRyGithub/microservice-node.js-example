const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const IncidentModel = require('../../modules/models/incident');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const {
  ConsumerBankValidation
} = require('../../modules/incident/usecases/consumer-bank-validation');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');

async function handler(
  { invoke, context, data },
  { messagingRepository = new RpcMessageRepository(invoke) } = {}
) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });
  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const logger = loggerFactory.create('ConsumerBankValidationResponse');
    const dependencies = {
      incidentRepository,
      messagingRepository
    };
    const bankValidation = new ConsumerBankValidation(dependencies, data);
    const { resolved, rejected } = await bankValidation.execute(data);
    logger.debug(`Bank validation : resolved:${resolved} rejected:${rejected}`);
    await trx.commit();
    await bankValidation.notify();

    return { body: { resolved, rejected } };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const singleOrArray = (itemSchema) => ({
  anyOf: [itemSchema, { type: 'array', items: itemSchema }]
});

module.exports = {
  handler,
  options: { prefetch: 1 },
  meta: {
    description: 'Update refund statuses for consumers (based on feedback from bank) ',
    requestSchema: schemaUtils.object('Request', {
      properties: {
        filters: schemaUtils.object('Filters', {
          properties: {
            endToEndIds: singleOrArray(
              schemaUtils.string(
                'List of EndToEndId incident ids (Here we provide only ones that we are going to REJECTED) other will be set as RESOLVED'
              )
            )
          }
        })
      }
    }),
    responseSchema: {
      type: 'object',
      properties: {
        resolved: schemaUtils.number('Number of resolved incidents'),
        rejected: schemaUtils.number('Number of rejected incidents')
      }
    }
  }
};
