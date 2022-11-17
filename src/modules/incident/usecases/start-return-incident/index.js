const { SqlIncidentRepository } = require('../../adapters/sql-incident-repository');
const { BaseIncident } = require('../../domain/incident/base');
const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');

class StartReturnIncidentUseCase {
  constructor({ incidentRepository = new SqlIncidentRepository() } = {}) {
    this.incidentRepository = incidentRepository;
  }

  async execute(parcelId) {
    let incidents = (await this.incidentRepository.findAllByParcelId(parcelId)) || [];

    incidents = incidents
      .filter(
        ({ type, status }) =>
          type === INCIDENT_TYPES.CONSUMER_RETURN && status === BaseIncident.STATUSES.CREATED
      )
      .map((incident) => {
        incident.updateStatus(BaseIncident.STATUSES.STARTED);

        return incident;
      });

    await Promise.all(incidents.map((incident) => this.incidentRepository.update(incident)));

    return incidents;
  }
}

module.exports = { StartReturnIncidentUseCase };
