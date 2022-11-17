/* eslint-disable consistent-return */
const {
  // eslint-disable-next-line no-unused-vars
  INCIDENT_TYPES
} = require('../../domain/incident/constants/incident-types');

class IncidentCreationContextCompositionEngine {
  /**
   * @param {Object} param
   * @param {IncidentRepository} param.incidentRepository
   * @param {ShipmentRepository} param.shipmentRepository
   * @param {CurrentDateHost} param.currentDateHost
   */
  constructor({ incidentRepository, shipmentRepository, currentDateHost }) {
    this.incidentRepository = incidentRepository;
    this.shipmentRepository = shipmentRepository;
    this.currentDateHost = currentDateHost;
  }

  /**
   * @param {Object} param
   * @param {Parcel} param.parcel
   * @param {keyof INCIDENT_TYPES} param.incidentType
   * @returns {IncidentCreationContext}
   */
  async compose({ parcel, incidentType }) {
    const similarIncidents = await this.incidentRepository.findAllByParcelId(parcel.id);

    const deliveryPromise = await this.findOneDeliveryPromiseByParcelId(parcel.id.toString());

    const currentDate = this.currentDateHost.get();

    return {
      parcel,
      incidentType,
      similarIncidents,
      deliveryPromise,
      currentDate
    };
  }

  /**
   * @private
   * @param {string} parcelId
   * @returns {Promise<DeliveryPromise | void>}
   */
  async findOneDeliveryPromiseByParcelId(parcelId) {
    const shipment = await this.shipmentRepository.findOneByParcelId(parcelId);

    if (!shipment || !shipment.state || !shipment.state.deliveryPromise) {
      return;
    }

    return shipment.state.deliveryPromise;
  }
}

/**
 * @typedef {Object} IncidentCreationContext
 * @property {Parcel} parcel
 * @property {Incident | void} similarIncident
 * @property {DeliveryPromise | void} deliveryPromise
 * @property {Date} currentDate
 */

module.exports = { IncidentCreationContextCompositionEngine };
