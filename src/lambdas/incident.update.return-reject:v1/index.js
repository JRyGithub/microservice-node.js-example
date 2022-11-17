const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const IncidentModel = require('../../modules/models/incident');
const {
  ResolveNotShippedReturnIncidentUseCase
} = require('../../modules/incident/usecases/resolve-not-shipped-return-incident');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');

async function handler(
  { invoke, context },
  { parcelRepository = new RpcParcelRepository(invoke) } = {}
) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });

  const logger = loggerFactory.create('labmda/return.reject-incident:v1');

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);

    const rejectNotShippedReturnIncidents = new ResolveNotShippedReturnIncidentUseCase({
      incidentRepository,
      parcelRepository
    });
    const incidents = await rejectNotShippedReturnIncidents.execute();
    await trx.commit();

    if (incidents.length === 0) {
      logger.debug(`No incidents to Reject`);
    } else {
      incidents.forEach((incident) => {
        logger.debug(
          `Incident ${incident.id} updated with status ${BaseIncident.STATUSES.REJECTED}`
        );
      });
    }

    return { rejected: incidents.length };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const meta = {
  description: 'Lambda to reject return incident (triggered by cronjob)',
  requestSchema: {},
  responseSchema: {
    type: 'object',
    properties: {
      rejected: schemaUtils.number('Number of rejected incidents')
    }
  }
};

module.exports = { handler, meta };
