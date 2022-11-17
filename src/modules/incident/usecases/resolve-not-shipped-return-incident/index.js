const { BaseIncident } = require('../../domain/incident/base');

// eslint-disable-next-line no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SLA_DAYS = 63;

class ResolveNotShippedReturnIncidentUseCase {
  constructor({ incidentRepository, parcelRepository, now = new Date() } = {}) {
    this.incidentRepository = incidentRepository;
    this.parcelRepository = parcelRepository;
    this.now = now;
  }

  /**
   * @private
   * @param {string} value
   * @returns {Promise<Number | void>}
   */
  // eslint-disable-next-line class-methods-use-this
  toTime(value) {
    return new Date(value).getTime() || 0;
  }

  /**
   * @private
   * @returns {Promise<Number | void>}
   */

  isNotShippedAndSLANotBreach(incident, parcels) {
    const {
      entityId: parcelId,
      returns: { parcelId: returnParcelId }
    } = incident;
    const returnParcel = parcels.find((item) => item.id.toString() === returnParcelId);
    const originalParcel = parcels.find((item) => item.id.toString() === parcelId);

    if (!returnParcel) return false;

    const now = this.now.getTime();
    const originalParcelDeliveredAt = this.toTime(originalParcel.deliveredAt);
    const returnParcelShippedAt = this.toTime(returnParcel.shippedAt);

    if (originalParcelDeliveredAt === 0) return false;
    if (returnParcelShippedAt !== 0) return false;

    return now - originalParcelDeliveredAt > SLA_DAYS * ONE_DAY_MS;
  }

  async execute() {
    let incidents =
      (await this.incidentRepository.findReturnsByStatus(BaseIncident.STATUSES.STARTED)) || [];

    incidents = incidents.filter((incident) => !!incident.returns);

    if (incidents.length === 0) return [];

    const returnIds = incidents
      .map((incident) => (incident.returns ? incident.returns.parcelId : null))
      .filter((id) => !!id);
    const originalParcelIds = incidents.map((incident) => incident.entityId).filter((id) => !!id);

    const [parcels] = await Promise.all([
      this.parcelRepository.findByIds({
        ids: [...returnIds, ...originalParcelIds],
        includes: ['parcel.admin']
      })
    ]);

    incidents = incidents
      .map((incident) => {
        if (this.isNotShippedAndSLANotBreach(incident, parcels)) {
          incident.updateStatus(BaseIncident.STATUSES.REJECTED);
        }

        return incident;
      })
      .filter((incident) => incident.status === BaseIncident.STATUSES.REJECTED);

    await Promise.all(incidents.map((incident) => this.incidentRepository.update(incident)));

    return incidents;
  }
}

module.exports = { ResolveNotShippedReturnIncidentUseCase };
