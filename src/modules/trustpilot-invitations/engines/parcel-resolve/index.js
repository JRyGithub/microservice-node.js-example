const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');

class ParcelResolveEngine {
  /**
   * @param {Object} param
   * @param {IncidentRepository} param.incidentRepository
   * @param {ParcelRepository} param.parcelRepository
   */
  constructor({ incidentRepository, parcelRepository }) {
    this.incidentRepository = incidentRepository;
    this.parcelRepository = parcelRepository;
  }

  /**
   * @param {Object} param
   * @param {number | string} param.entityId
   * @param {string} param.entityType
   */
  async resolve({ entityId, entityType }) {
    let parcelId;

    if (entityType === TrustpilotInvitation.ENTITY_TYPES.PARCEL) {
      parcelId = entityId;
    } else {
      const incident = await this.incidentRepository.findById(entityId);
      parcelId = incident.entityId;
    }

    return this.parcelRepository.findById({
      id: parcelId,
      includes: [
        'parcel.validations',
        'parcel.admin',
        'parcel.pii',
        'parcel.isTrustedDestination',
        'parcel.details'
      ]
    });
  }
}

module.exports = { ParcelResolveEngine };
