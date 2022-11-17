const { transaction } = require('objection');
const globalLogger = require('../../drivers/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../modules/core/adapters/transient-contextualized-logger');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const IncidentModel = require('../../modules/models/incident');
const {
  StartReturnIncidentUseCase
} = require('../../modules/incident/usecases/start-return-incident');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');

async function handler({ data: { id: parcelId }, context }) {
  const loggerFactory = new TransientContextualizedLoggerFactory({
    context,
    innerLogger: globalLogger
  });

  const logger = loggerFactory.create('listeners/parcel.shipped:v1');

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);

    const startReturnIncident = new StartReturnIncidentUseCase({
      incidentRepository
    });

    const incidents = await startReturnIncident.execute(parcelId);
    await trx.commit();

    if (incidents.length === 0) {
      logger.debug(`No incidents to update for parcel ${parcelId}`);
    } else {
      incidents.forEach((incident) => {
        logger.debug(
          `Incident ${incident.id} updated with status ${BaseIncident.STATUSES.STARTED}`
        );
      });
    }

    return {};
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const meta = {
  description: 'Listener shipped parcel',
  requestSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Parcel identifier.'
      }
    },
    required: ['id']
  },
  responseSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'number',
        description: 'Response HTTP status',
        default: 200
      }
    }
  }
};

module.exports = { handler, meta };
