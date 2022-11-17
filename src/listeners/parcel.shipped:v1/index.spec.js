/* eslint-disable consistent-return */
const { v4: uuid } = require('uuid');
const { expect } = require('chai');
const { transaction } = require('objection');
const { knex } = require('../../drivers/mysql');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { buildIncident } = require('./tests/utils/incident');
const { handler } = require('.');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const IncidentModel = require('../../modules/models/incident');
const { INCIDENT_ENTITY_TYPES } = require('../../modules/incident/domain/incident');

describe('listeners/parcel.shipped:v1', () => {
  async function callHandler(parcelId) {
    return handler({ data: { id: parcelId }, context: {} });
  }

  async function findIncident({ id }) {
    return IncidentModel.query().where('id', id).execute();
  }

  async function deleteIncidents(incidents) {
    const trx = await transaction.start(knex);

    try {
      await IncidentModel.query(trx)
        .delete()
        .findByIds(incidents.map(({ id }) => id))
        .execute();
      await trx.commit();

      return;
    } catch (e) {
      await trx.rollback();
      throw e;
    }
  }

  async function createIncident(incident, trx) {
    const incidentRepository = new SqlIncidentRepository(trx);
    await incidentRepository.create(incident);
  }

  async function createIncidents(incidents) {
    const trx = await transaction.start(knex);

    try {
      const ids = await Promise.all(incidents.map((incident) => createIncident(incident, trx)));
      await trx.commit();

      return ids;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  it('should update CREATED incident with provided parcelId -> CREATED to STARTED', async () => {
    const parcelId = '123';
    const createdIncidentId = uuid();
    const incidents = [
      buildIncident({
        id: createdIncidentId,
        entityId: parcelId,
        entityType: INCIDENT_ENTITY_TYPES.PARCEL,
        status: BaseIncident.STATUSES.CREATED
      }),
      buildIncident({
        id: uuid(),
        entityId: parcelId,
        entityType: INCIDENT_ENTITY_TYPES.PARCEL,
        status: BaseIncident.STATUSES.STARTED
      }),
      buildIncident({
        id: uuid(),
        entityId: parcelId,
        entityType: INCIDENT_ENTITY_TYPES.PARCEL,
        status: BaseIncident.STATUSES.RESOLVED
      }),
      buildIncident({
        id: uuid(),
        entityId: parcelId,
        entityType: INCIDENT_ENTITY_TYPES.PARCEL,
        status: BaseIncident.STATUSES.REJECTED
      })
    ];
    await createIncidents(incidents);

    await callHandler(parcelId);
    const [createdIncident] = await findIncident({ id: createdIncidentId });

    expect(createdIncident.status).to.be.equal(BaseIncident.STATUSES.STARTED);

    await deleteIncidents(incidents);
  });
});
