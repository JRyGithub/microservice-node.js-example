const IncidentModel = require('../../../../modules/models/incident');
const {
  // eslint-disable-next-line no-unused-vars
  BaseIncident
} = require('../../../../modules/incident/domain/incident/base');

/**
 * @param {BaseIncident[]} tis
 * @param {import("objection").Transaction | void} trx
 * @returns {void}
 */
async function deleteIncidents(tis, trx) {
  await IncidentModel.query(trx)
    .delete()
    .findByIds(tis.map(({ id }) => id))
    .execute();
}

module.exports = { deleteIncidents };
