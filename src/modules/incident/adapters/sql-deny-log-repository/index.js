const pick = require('lodash/pick');
const IncidentCreationDenyLogModel = require('../../../models/incident-creation-deny-log');

/**
 * @interface RequesterRepository
 * @property {Transaction} transaction
 */
class SqlDenyLogRepository {
  /**
   * @param {Transaction} trx - if provided, ALL repo queries will be done in the same transaction
   */
  constructor(trx) {
    this.trx = trx;
  }

  /**
   * @param {Object} log
   * @returns {Promise<void>}
   */
  async create(log) {
    const dbGraph = logToDbGraph(log);
    const createdRecord = await IncidentCreationDenyLogModel.query(this.trx).insertGraph(dbGraph);

    return createdRecord;
  }
}

const ROOT_PROPERTIES = ['id', 'parcelId', 'incidentType', 'reason'];

function logToDbGraph(log) {
  return pick(log, [...ROOT_PROPERTIES]);
}

module.exports = { SqlDenyLogRepository };
