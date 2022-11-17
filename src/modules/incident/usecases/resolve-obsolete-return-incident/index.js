const { BaseIncident } = require('../../domain/incident/base');

// eslint-disable-next-line no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SLA_DAYS = 7;

class ResolveObsoleteReturnIncidentUseCase {
  constructor({ incidentRepository, parcelRepository, shipmentRepository, now = new Date() } = {}) {
    this.incidentRepository = incidentRepository;
    this.parcelRepository = parcelRepository;
    this.shipmentRepository = shipmentRepository;
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
   * @param {Object} shipment
   * @returns {Promise<Number | void>}
   */
  deliveryPromiseDays(shipment, originalParcel) {
    if (!shipment.state || !shipment.state.deliveryPromise) {
      return null;
    }

    const shippedAt = this.toTime(originalParcel.shippedAt);
    const deliveryPromise = this.toTime(shipment.state.deliveryPromise);

    if (!shippedAt || !deliveryPromise) return null;

    return deliveryPromise - shippedAt;
  }

  isTooLong(incident, parcels, shipments) {
    const {
      entityId: parcelId,
      returns: { parcelId: returnParcelId }
    } = incident;

    const returnParcel = parcels.find((item) => item.id.toString() === returnParcelId);
    const originalParcel = parcels.find((item) => item.id.toString() === parcelId);
    const shipment = shipments.find((item) => item.id === parcelId);

    if (!returnParcel || !shipment) return false;

    const now = this.now.getTime();
    const returnParcelShippedAt = this.toTime(returnParcel.shippedAt);
    const deliveryPromiseDays = this.deliveryPromiseDays(shipment, originalParcel);

    if (deliveryPromiseDays === null) return false;
    if (returnParcelShippedAt === 0) return false;

    return now - returnParcelShippedAt < deliveryPromiseDays + SLA_DAYS * ONE_DAY_MS;
  }

  async execute() {
    let incidents =
      (await this.incidentRepository.findReturnsByStatus(BaseIncident.STATUSES.STARTED)) || [];

    incidents = incidents.filter((incident) => !!incident.returns);

    if (incidents.length === 0) {
      return [];
    }

    const returnIds = incidents
      .map((incident) => (incident.returns ? incident.returns.parcelId : null))
      .filter((id) => !!id);
    const originalParcelIds = incidents.map((incident) => incident.entityId).filter((id) => !!id);

    const [parcels, shipments] = await Promise.all([
      this.parcelRepository.findByIds({
        ids: [...returnIds, ...originalParcelIds],
        includes: ['parcel.admin']
      }),
      this.shipmentRepository.findByIds({
        ids: originalParcelIds
      })
    ]);

    incidents = incidents
      .map((incident) => {
        if (this.isTooLong(incident, parcels, shipments)) {
          incident.updateStatus(BaseIncident.STATUSES.RESOLVED);
        }

        return incident;
      })
      .filter((incident) => incident.status === BaseIncident.STATUSES.RESOLVED);

    await Promise.all(incidents.map((incident) => this.incidentRepository.update(incident)));

    return incidents;
  }
}

module.exports = { ResolveObsoleteReturnIncidentUseCase };
