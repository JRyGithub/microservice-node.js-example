const { createIncident } = require('../../domain/incident');

/**
 * Create an incident from given entity details
 * & customer attachments.
 *
 * Based on the incident type, it will trigger the right
 * document validations, hydrating the right input payloads
 *
 * @param {Object} params
 * @param {ProductRepository} params.productRepository
 * @param {ItemRepository} params.incidentRepository
 * @param {IncidentRepository} params.itemRepository
 */
function preprocessIncidentUsecase({
  rpcProductRepository,
  sqlProductRepository,
  itemRepository,
  incidentRepository
}) {
  const preprocessingDependencies = {
    itemRepository,
    rpcProductRepository,
    sqlProductRepository,
    incidentRepository
  };

  return {
    /**
     *
     * @param {CreateIncidentDTO} payload - same payload as create-incident
     * @return {Promise<string>} incident id just created
     */
    async execute(payload) {
      const incident = createIncident(payload);

      return incident.preprocess(preprocessingDependencies);
    }
  };
}

module.exports = { preprocessIncidentUsecase };
