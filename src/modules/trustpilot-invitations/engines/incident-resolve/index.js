class IncidentResolveEngine {
  /**
   * @param {Object} param
   * @param {IncidentRepository} param.incidentRepository
   */
  constructor({ incidentRepository }) {
    this.incidentRepository = incidentRepository;
  }

  /**
   * @param {Object} param
   * @param {number | string} param.entityId
   * @param {keyof TrustpilotInvitation.ENTITY_TYPES} param.entityType
   * @returns {Promise<Incident | void>}
   */
  async resolve({ entityId }) {
    return this.incidentRepository.findByParcelId(entityId);
  }
}

module.exports = { IncidentResolveEngine };
