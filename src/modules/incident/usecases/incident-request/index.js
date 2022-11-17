const { transaction } = require('objection');
const { BadRequestError } = require('@devcubyn/core.errors');
// models
const IncidentModel = require('../../../models/incident');
const { createIncidentUsecase } = require('../create-incident');
const { preprocessIncidentUsecase } = require('../preprocess-incident');
const { SqlIncidentRepository } = require('../../adapters/sql-incident-repository');
const { AttachmentValidation } = require('../../domain/attachment-validation');
const { INCIDENT_TYPES } = require('../../domain/incident');
const { ORIGIN_TYPES } = require('../../domain/incident/base');

class IncidentRequest {
  constructor({ productRepository, itemRepository, documentValidationRepository }) {
    this.productRepository = productRepository;
    this.itemRepository = itemRepository;
    this.documentValidationRepository = documentValidationRepository;
  }

  /**
   * @param {Object<string,Object[]>} ticketFiles
   * @returns {Attachment[]}
   */
  // eslint-disable-next-line class-methods-use-this
  selectAndMapFiles(ticketFiles = {}) {
    return Object.keys(ticketFiles).reduce((attachments, type) => {
      // We get only attachment with existing types
      if (Object.keys(AttachmentValidation.TYPES).includes(type)) {
        const attachmentsByType = ticketFiles[type].map(({ fileKey }) => ({
          type,
          fileKey
        }));
        attachments.push(...attachmentsByType);
      }

      return attachments;
    }, []);
  }

  async preprocess(incidentPayload) {
    const incidentRepository = new SqlIncidentRepository();

    const preprocessIncident = preprocessIncidentUsecase({
      sqlProductRepository: this.productRepository,
      itemRepository: this.itemRepository,
      incidentRepository
    });

    const { preprocessing } = await preprocessIncident.execute(incidentPayload);

    return {
      success: !preprocessing.hasErrors(),
      checks: preprocessing.checks
    };
  }

  async create(incidentPayload) {
    const trx = await transaction.start(IncidentModel.knex());

    try {
      const incidentRepository = new SqlIncidentRepository(trx);
      const createIncident = createIncidentUsecase({
        incidentRepository,
        sqlProductRepository: this.productRepository,
        itemRepository: this.itemRepository,
        documentValidationRepository: this.documentValidationRepository
      });
      const incidentId = await createIncident.execute(incidentPayload);
      await trx.commit();

      return incidentId;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async execute(data) {
    const {
      isDryRun = false,
      userId,
      referenceId,
      ticket: { reasonType, fileMap: ticketFiles }
    } = data;
    const incidentType = INCIDENT_TYPES[reasonType];

    // We reach this part, zendesk ticket hasn't been created due to dry run
    if (!incidentType && isDryRun) {
      throw new BadRequestError('No dry-run can be performed on that ticket');
    }

    const payload = {
      type: incidentType,
      ownerId: userId,
      origin: ORIGIN_TYPES.ZENDESK,
      entityId: referenceId,
      attachments: this.selectAndMapFiles(ticketFiles)
    };

    if (isDryRun) {
      const preprocessing = await this.preprocess(payload);

      return preprocessing;
    }

    const indidentId = await this.create(payload);

    return { id: indidentId };
  }
}

module.exports = { IncidentRequest };
