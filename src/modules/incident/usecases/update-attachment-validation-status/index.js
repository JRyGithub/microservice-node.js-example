const { assert, ResourceNotFoundError } = require('../../errors');
const { BaseIncident, USER_TYPES, RESOLUTION_TYPES } = require('../../domain/incident/base');
const { AttachmentValidation } = require('../../domain/attachment-validation');
const { INCIDENT_ATTACHMENT_REJECT_REASON } = require('../../domain/incident/base');

/**
 * Called when any document validation has progressed (status update):
 * It will update the status of the attachment and the incident status
 * (and/or refund status)
 *
 * @param {Object} params
 * @param {IncidentRepository} params.incidentRepository
 * @param {ProductRepository} params.productRepository
 * @param {RefundRepository} params.refundRepository
 * @param {MessageRepository} params.messageRepository
 */
function updateAttachmentValidationStatusUsecase({
  incidentRepository,
  productRepository,
  refundRepository,
  messageRepository,
  parcelRepository
}) {
  return {
    rejectedReason({ incident, attachmentValidation, payload }) {
      return {
        reasons: INCIDENT_ATTACHMENT_REJECT_REASON,
        add() {
          if (!payload) return;
          // we don't need to set rejected reason if status is resolved.
          if (attachmentValidation.status !== AttachmentValidation.STATUSES.REJECTED) {
            return;
          }

          switch (attachmentValidation.type) {
            case AttachmentValidation.TYPES.BUYING_INVOICE:
              this.buyingInvoice();
              break;
            case AttachmentValidation.TYPES.COMMERCIAL_INVOICE:
              this.commercialInvoice();
              break;
            case AttachmentValidation.TYPES.IDENTIFICATION_DOCUMENT:
              this.identificationDocument();
              break;
            case AttachmentValidation.TYPES.AFFIDAVIT:
              this.affidavit();
              break;
            case AttachmentValidation.TYPES.POLICE_REPORT:
              this.policeReport();
              break;
            default:
              break;
          }
        },
        buyingInvoice() {
          const attachment = AttachmentValidation.TYPES.BUYING_INVOICE;

          if (payload.isInvoiceWordExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_NOT_MENTIONED}`);
          if (!payload.invoiceNumber)
            incident.addRejectedReason(
              `${attachment}.${this.reasons.INVOICE_NUMBER_NOT_MENTIONED}`
            );
          if (!payload.invoiceDate)
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_DATE_INCORRECT}`);
          else if (new Date(payload.invoiceDate) > new Date())
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_DATE_INCORRECT}`);
          if (!payload.skuValue)
            incident.addRejectedReason(`${attachment}.${this.reasons.SKU_VAL_DIFFERENT}`);
          if (payload.isSellerNameAndAddressExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.SELLER_NOT_MENTIONED}`);
          if (payload.isBuyerNameExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.BUYER_NOT_MENTIONED}`);
          if (payload.isSkuNameExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.SKU_NOT_MENTIONED}`);
        },
        commercialInvoice() {
          const attachment = AttachmentValidation.TYPES.COMMERCIAL_INVOICE;

          if (payload.isInvoiceWordExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_NOT_MENTIONED}`);
          if (!payload.invoiceNumber)
            incident.addRejectedReason(
              `${attachment}.${this.reasons.INVOICE_NUMBER_NOT_MENTIONED}`
            );
          if (payload.isCompanyNameAndAddressExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.COMPANY_NOT_MENTIONED}`);
          if (payload.isRecipientNameAndAddressExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.RECIPIENT_NOT_MENTIONED}`);
          if (!payload.invoiceDate)
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_DATE_INCORRECT}`);
          else if (new Date(payload.invoiceDate) >= new Date())
            incident.addRejectedReason(`${attachment}.${this.reasons.INVOICE_DATE_INCORRECT}`);
          if (!payload.reference)
            incident.addRejectedReason(
              `${attachment}.${this.reasons.ORDER_REFERENCE_NOT_MENTIONED}`
            );
        },
        identificationDocument() {
          const attachment = AttachmentValidation.TYPES.IDENTIFICATION_DOCUMENT;

          if (payload.isNameExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.NAME_NOT_MENTIONED}`);
          if (!payload.expiryDate)
            incident.addRejectedReason(`${attachment}.${this.reasons.ID_EXPIRED}`);
        },
        affidavit() {
          const attachment = AttachmentValidation.TYPES.AFFIDAVIT;

          if (payload.isAuthorNameExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.AUTHOR_NAME_NOT_MENTIONED}`);
          if (!payload.reference)
            incident.addRejectedReason(`${attachment}.${this.reasons.CUB_NUMBER_NOT_MENTIONED}`);
          if (payload.isValidReason === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.MOTIVE_NOT_MENTIONED}`);
          if (payload.isAffidavitSigned === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.SIGNATURE_NOT_MATCHING}`);
          if (!payload.affidavitDate)
            incident.addRejectedReason(`${attachment}.${this.reasons.AFFIDAVIT_DATE_INCORRECT}`);
        },
        policeReport() {
          const attachment = AttachmentValidation.TYPES.POLICE_REPORT;

          if (payload.isAuthorNameExists === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.AUTHOR_NAME_NOT_MENTIONED}`);
          if (!payload.reference)
            incident.addRejectedReason(`${attachment}.${this.reasons.CUB_NUMBER_NOT_MENTIONED}`);
          if (payload.isValidReason === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.MOTIVE_NOT_MENTIONED}`);
          if (payload.isAuthorSigned === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.AUTHOR_NOT_SIGNED}`);
          if (payload.isPoliceOfficerSigned === false)
            incident.addRejectedReason(`${attachment}.${this.reasons.SIGNATURE_NOT_MATCHING}`);
          if (!payload.reportPoliceDate)
            incident.addRejectedReason(
              `${attachment}.${this.reasons.POLICE_REPORT_DATE_INCORRECT}`
            );
        }
      };
    },
    /**
     * @param {Object} payload
     * @param {string} payload.validationId foreign document validation identifier
     * @param {string} payload.status new status to be updated
     * @param {Object} payload.payload all values inputed / parsed by document validation
     * @returns {Object} incident
     */
    async execute({ validationId, status: validationStatus, payload }) {
      /** @type {BaseIncident} */
      const incident = await incidentRepository.findByAttachmentValidationId(validationId);

      assert(incident, ResourceNotFoundError, 'Incident', `by validationId ${validationId}`);

      const { refundStatus: initialRefundStatus } = incident;

      const attachmentValidation = incident.findAttachmentValidation(validationId);

      incident.updateAttachmentValidationStatus(attachmentValidation.id, validationStatus, payload);

      if (
        initialRefundStatus !== incident.refundStatus &&
        incident.refundStatus === BaseIncident.REFUND_STATUSES.RESOLVED
      ) {
        await incident.computeConcernRefunds({ productRepository });
        const refundId = await refundRepository.createFromIncident(incident);

        incident.setRefundId(refundId);

        await incidentRepository.updateConcerns(incident.concerns);
      }

      // only the impacted attachment validation
      await incidentRepository.updateAttachmentValidation(attachmentValidation);
      // set rejected reason for incident
      this.rejectedReason({ incident, attachmentValidation, payload }).add();

      // @FIXME handle concurrency
      // all incident root properties
      await incidentRepository.update(incident);

      return incident;
    },

    /**
     * @param {object} payload
     * @param {string} payload.source
     * @param {string} payload.status
     * @param {string} payload.rejectedReason this is a string, but should be parsed to array
     * @param {RequesterDTO} payload.requester
     * @return {Promise<void>}
     */
    async notify(incident) {
      const { source, status, resolutionTypeSelected, resolutionTypeApplied } = incident;

      if (source !== USER_TYPES.RECIPIENT) return;
      // claim is rejected
      if (status === BaseIncident.STATUSES.REJECTED) {
        await messageRepository.claimRejected(incident);

        return;
      }

      if (!resolutionTypeApplied) return;

      // claim is resolved
      if (resolutionTypeSelected === resolutionTypeApplied) {
        const { entityId, concerns } = incident;
        const parcel = await parcelRepository.findById({
          id: entityId,
          includes: ['parcel.admin']
        });
        const products =
          (await productRepository.findByIds(concerns.map((concern) => concern.entityId))) || [];
        await messageRepository.claimResolved(
          incident,
          parcel,
          products.map((product) => product.name)
        );

        return;
      }
      // claim is resolved, but we refund instead
      if (resolutionTypeSelected === RESOLUTION_TYPES.RESHIP) {
        await messageRepository.claimResolvedOutOfStock(incident);
      }
    }
  };
}

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

module.exports = { updateAttachmentValidationStatusUsecase };
