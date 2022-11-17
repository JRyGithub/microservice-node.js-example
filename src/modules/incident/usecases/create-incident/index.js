const { createIncident } = require('../../domain/incident');
const { ManualFlowBaseIncident } = require('../../domain/incident/manual-flow-base');
const { USER_TYPES } = require('../../domain/incident/base');
const { IncidentPreprocessingError } = require('../../errors');
const { ValidationCatalogService } = require('../../services/validation-catalog');
const { Concern } = require('../../domain/concern');

/**
 * Create an incident from given entity details
 * & customer attachments.
 *
 * Based on the incident type, it will trigger the right
 * document validations, hydrating the right input payloads
 *
 * @param {Object} params
 * @param {IncidentRepository} params.incidentRepository
 * @param {DocumentValidationRepository} params.documentValidationRepository
 * @param {ProductRepository} params.productRepository
 * @param {ItemRepository} params.itemRepository
 * @param {MessageRepository} params.messageRepository
 * @param {FileRepository} params.fileRepository
 */
function createIncidentUsecase({
  incidentRepository,
  documentValidationRepository,
  sqlProductRepository,
  rpcProductRepository,
  itemRepository,
  messageRepository,
  fileRepository
}) {
  const validationCatalog = new ValidationCatalogService({
    productRepository: sqlProductRepository,
    documentValidationRepository
  });
  const preprocessingDependencies = {
    itemRepository,
    rpcProductRepository,
    sqlProductRepository,
    incidentRepository,
    fileRepository
  };
  const payloadHasConcerns = (concerns) => {
    if (!concerns) return false;
    if (!Array.isArray(concerns)) return false;

    return concerns.length > 0;
  };

  return {
    /**
     * @param {CreateIncidentDTO} payload
     * @return {Promise<object>} incident just created
     */
    async execute(payload) {
      const { concerns } = payload;
      // eslint-disable-next-line no-param-reassign
      payload.concerns = [];

      const incident = createIncident(payload);
      const isManualFlow = incident instanceof ManualFlowBaseIncident;
      // const urlsValues = await fileRepository.findUrls();

      // assert(
      //   Object.keys(urlsValues).length === 0 && urlsValues.constructor === Object,
      //   BadRequestError,
      //   `Was not uploaded to AWS`
      // );
      const preprocess = await incident.preprocess(preprocessingDependencies);

      if (preprocess.preprocessing.hasErrors()) {
        throw new IncidentPreprocessingError(preprocess.preprocessing);
      }
      if (!isManualFlow) {
        // check all requirements and populate related concerns
        const { product } = preprocess;

        // @FIXME handle concurrency:
        // What if incidentRepository.create below fails?
        await incident.startAttachmentValidations({ validationCatalog, product });
      } else if (payloadHasConcerns(concerns) && incident.isRecipientSource()) {
        const incidentConcerns = concerns.map((concern) =>
          Concern.createProduct(incident.id, concern)
        );
        incident.addConcerns(incidentConcerns);
      }

      // persist incident, attachments & concerns
      await incidentRepository.create(incident);

      return incident;
    },

    /**
     * @param {Object} payload
     * @param {string} payload.source
     * @param {RequesterDTO} payload.requester
     * @return {Promise<void>}
     */
    async notify(incident) {
      const { source } = incident;

      if (source !== USER_TYPES.RECIPIENT) return;
      await messageRepository.claimCreated(incident);
    }
  };
}

/**
 * @typedef {Object} CreateIncidentDTO
 * @property {string} ownerId
 * @property {string} origin
 * @property {string} originId
 * @property {string} entityId
 * @property {string} entityType
 * @property {string} type
 * @property {Attachment[]} attachments
 */

/**
 * @typedef {Object} BankInfoDTO
 * @property {string} bic
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} iban
 * @property {string} country
 */

/**
 * @typedef {Object} RequesterDTO
 * @property {number} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {BankInfoDTO} bankInfo
 * @return {Promise<void>}
 */

module.exports = { createIncidentUsecase };
