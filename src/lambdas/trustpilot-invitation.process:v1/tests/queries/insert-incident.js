const {
  SqlIncidentRepository
} = require('../../../../modules/incident/adapters/sql-incident-repository');
const {
  // eslint-disable-next-line no-unused-vars
  BaseIncident
} = require('../../../../modules/incident/domain/incident/base');

/**
 * @param {BaseIncident} incident
 * @param {import("objection").Transaction | void} trx
 * @returns {BaseIncident}
 */
async function insertIncident(incident, trx) {
  const incidentRepository = new SqlIncidentRepository(trx);

  await incidentRepository.create(incident);

  return incident;
}

module.exports = { insertIncident };
