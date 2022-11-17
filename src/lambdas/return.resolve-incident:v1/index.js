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
  ResolveObsoleteReturnIncidentUseCase
} = require('../../modules/incident/usecases/resolve-obsolete-return-incident');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const {
  RpcShipmentRepository
} = require('../../modules/incident/adapters/rpc-shipment-repository');

async function handler(
  { invoke, context },
  {
    parcelRepository = new RpcParcelRepository(invoke),
    shipmentRepository = new RpcShipmentRepository(invoke)
  } = {}
) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });

  const logger = loggerFactory.create('labmda/return.resolve-incident:v1');

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);

    const resolveObsoleteReturnIncidents = new ResolveObsoleteReturnIncidentUseCase({
      incidentRepository,
      parcelRepository,
      shipmentRepository
    });
    const incidents = await resolveObsoleteReturnIncidents.execute();
    await trx.commit();

    if (incidents.length === 0) {
      logger.debug(`No incidents to RESOLVE`);
    } else {
      incidents.forEach((incident) => {
        logger.debug(
          `Incident ${incident.id} updated with status ${BaseIncident.STATUSES.RESOLVED}`
        );
      });
    }

    return { resolved: incidents.length };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const meta = {
  description: 'Lambda to resolve return incident (triggered by cronjob)',
  requestSchema: {},
  responseSchema: {
    type: 'object',
    properties: {
      resolved: schemaUtils.number('Number of resolved incidents')
    }
  }
};

module.exports = { handler, meta };
