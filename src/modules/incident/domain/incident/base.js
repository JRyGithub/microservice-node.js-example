/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
const { v4: uuid } = require('uuid');
const { ServerError, InvalidManualFlowIncidentError } = require('../../errors');
const { AttachmentValidation } = require('../attachment-validation');
const { INCIDENT_ENTITY_TYPES } = require('./constants/incident-entity-type');
const { TICKET_REASON_TYPES } = require('../../../models/entity-type/constants');
const { PreprocessingResult, PreprocessingChecks } = require('./preprocessing-result');

const INCIDENT_STATUSES = {
  CREATED: 'CREATED',
  STARTED: 'STARTED',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED'
};

// same for the moment
const INCIDENT_REFUND_STATUSES = INCIDENT_STATUSES;

const INCIDENT_STARTED_STATUSES = ['STARTED', 'RESOLVED', 'REJECTED'];
const INCIDENT_REFUND_STARTED_STATUSES = ['STARTED', 'RESOLVED', 'REJECTED'];

const INCIDENT_ATTACHMENT_REJECT_REASON = {
  // buying invoice
  INVOICE_NOT_MENTIONED: 'INVOICE_NOT_MENTIONED',
  INVOICE_NUMBER_NOT_MENTIONED: 'INVOICE_NUMBER_NOT_MENTIONED',
  INVOICE_DATE_INCORRECT: 'INVOICE_DATE_INCORRECT',
  SKU_VAL_DIFFERENT: 'SKU_VAL_DIFFERENT',
  SELLER_NOT_MENTIONED: 'SELLER_NOT_MENTIONED',
  BUYER_NOT_MENTIONED: 'BUYER_NOT_MENTIONED',
  SKU_NOT_MENTIONED: 'SKU_NOT_MENTIONED',
  // commercial invoice
  COMPANY_NOT_MENTIONED: 'COMPANY_NOT_MENTIONED',
  RECIPIENT_NOT_MENTIONED: 'RECIPIENT_NOT_MENTIONED',
  ORDER_REFERENCE_NOT_MENTIONED: 'ORDER_REFERENCE_NOT_MENTIONED',
  // ID Doc
  NAME_NOT_MENTIONED: 'NAME_NOT_MENTIONED',
  ID_EXPIRED: 'ID_EXPIRED',
  // affidavit
  AUTHOR_NAME_NOT_MENTIONED: 'AUTHOR_NAME_NOT_MENTIONED',
  CUB_NUMBER_NOT_MENTIONED: 'CUB_NUMBER_NOT_MENTIONED',
  MOTIVE_NOT_MENTIONED: 'MOTIVE_NOT_MENTIONED',
  SIGNATURE_NOT_MATCHING: 'SIGNATURE_NOT_MATCHING',
  AFFIDAVIT_DATE_INCORRECT: 'AFFIDAVIT_DATE_INCORRECT',
  // police report
  AUTHOR_NOT_SIGNED: 'AUTHOR_NOT_SIGNED',
  POLICE_REPORT_DATE_INCORRECT: 'POLICE_REPORT_DATE_INCORRECT'
};

const USER_TYPES = {
  SHIPPER: 'SHIPPER',
  RECIPIENT: 'RECIPIENT',
  CUBYN_AGENT: 'CUBYN_AGENT'
};

const RESOLUTION_TYPES = {
  RESHIP: 'RESHIP',
  REFUND: 'REFUND'
};

const ORIGIN_TYPES = {
  ZENDESK: 'ZENDESK',
  OMS: 'OMS',
  SHIPPER: 'SHIPPER',
  API: 'API',
  RECIPIENT: 'RECIPIENT'
};

/**
 * The base aggregate root to track an Incident.
 * An Incident is a "complaint" or a "request" of some activity anomaly:
 * - product lost
 * - item missing at reception
 * - item received damaged
 * - ...
 *
 * @property {string} id
 * @property {string} type
 * @property {string} status
 * @property {string} refundStatus
 * @property {string} origin
 * @property {string} originId
 * @property {string} ownerId
 * @property {string} entityId
 * @property {string} entityType
 * @property {Attachment[]} attachments
 * @property {AttachmentValidation[]} attachmentValidations
 * @property {Concern[]} concerns
 */
class BaseIncident {
  /**
   * @param {Object} values
   */
  constructor(values, incidentValidationTypes = [], refundValidationTypes = []) {
    this.attachments = [];
    this.attachmentValidations = [];
    this.concerns = [];
    this.id = values.id || uuid();
    this.createdAt = values.createdAt || new Date();
    // both are set in the database as default values
    this.status = INCIDENT_STATUSES.CREATED;
    this.refundStatus = INCIDENT_REFUND_STATUSES.CREATED;

    this.incidentValidationTypes = incidentValidationTypes;
    this.refundValidationTypes = refundValidationTypes;

    // by default we set shipper
    this.source = values.source || USER_TYPES.SHIPPER;

    Object.assign(this, values);

    this.setSelectedResolutionType();

    this.attachmentValidations = (values.attachmentValidations || []).map(
      (validation) => new AttachmentValidation(validation)
    );
  }

  /**
   * Preprocess this incident to:
   * - detect requirement violations
   * - list all related concerns (to be refunded later)
   *
   * @param {Object} dependencies
   * @returns {PreprocessingResult}
   */
  async preprocess(dependencies) {
    // hack: ServerError to make sure it will not bubble up as a carotte retry
    // TODO Put attachment check
    const { fileRepository } = dependencies;

    const preprocessing = new PreprocessingResult();

    if (this.attachments.length > 0) {
      const fileKeys = this.attachments.map((attachment) => {
        return attachment.fileKey;
      });

      const fileKeyUrls = fileRepository.findUrls(fileKeys);

      if (Object.keys(fileKeyUrls).length === 0 && fileKeyUrls.constructor === Object) {
        preprocessing.attachmentUploaded(
          PreprocessingChecks.ATTACHMENT_UPLOADED,
          {
            id: this.entityId
          },
          false
        );
      }
    }

    return preprocessing;
    // throw new ServerError('not implemented');
  }

  /**
   * Based on incident type, analyze attachments and
   * create specific document validations
   *
   * @param {ValidationCatalogService} validationCatalog
   */
  async startAttachmentValidations({ validationCatalog }) {
    // hack: ServerError to make sure it will not bubble up as a carotte retry
    throw new ServerError('not implemented');
  }

  /**
   * @param {string} type
   * @returns {Attachment[]}
   */
  getAttachments(type) {
    return this.attachments.filter((attachment) => attachment.type === type);
  }

  /**
   * @param {Concern} concern
   */
  addConcern(concern) {
    // eslint-disable-next-line no-param-reassign
    concern.incidentId = this.id;
    this.concerns.push(concern);
  }

  /**
   * @param {Concern[]} concerns
   */
  addConcerns(concerns) {
    concerns.forEach(this.addConcern.bind(this));
  }

  /**
   * @param {string} validationId - id of the foreign document-validation resource
   * @returns {AttachmentValidation}
   */
  findAttachmentValidation(validationId) {
    return this.attachmentValidations.find(
      (validation) => validation.validationId === validationId
    );
  }

  /**
   * Checks in concerns in some have refunds to be declared
   * @returns {boolean}
   */
  hasRefundToDeclare() {
    return this.concerns && this.concerns.some((concern) => concern.hasRefundToDeclare());
  }

  /**
   * @param {number} refundId refund foreign resource identifier
   */
  setRefundId(id) {
    this.refundId = id;
  }

  /**
   * @param {string} key rejected reason key
   */
  addRejectedReason(key) {
    const currentRejectedReason = JSON.parse(this.rejectedReason || null) || [];
    currentRejectedReason.push({
      key
    });
    this.rejectedReason = JSON.stringify(currentRejectedReason);
  }

  /**
   * Manually reject incident
   * Forbidden by default, unless overriden by incident's child class
   *
   * @param {string} rejectedReason
   */
  forceReject(rejectedReason) {
    throw new InvalidManualFlowIncidentError(this.type);
  }

  /**
   * Manually resolve incident
   * Forbidden by default, unless overriden by incident's child class
   *
   * @param {number} shippingFeesAmount
   * @param {number} merchandiseValue
   * @param {'RESHIP' | 'REFUND'} appliedResolution
   */
  forceResolve() {
    throw new InvalidManualFlowIncidentError(this.type);
  }

  /**
   * Update some validation status (and recompute incident statuses)
   *
   * @param {string} id
   * @param {string} status
   * @param {Object} payload
   */
  updateAttachmentValidationStatus(id, status, payload = null) {
    const attachmentValidation = this.attachmentValidations.find(
      (validation) => validation.id === id
    );

    if (!attachmentValidation) {
      return;
    }

    attachmentValidation.setStatus(status, payload);

    this.computeStatuses();
  }

  /**
   * Complete incident action
   */
  complete() {
    // it might have unlocked refund
    // a rejection of incident triggers a rejection of refunds
    this.computeRefundStatus();

    this.setAppliedResolutionType();
  }

  /**
   * Update incident's status. This triggers in waterfall
   * a reevaluation of the refund status
   *
   * @param {string} newStatus
   */
  updateStatus(newStatus) {
    if (newStatus === this.status) return;

    this.status = newStatus;

    if (newStatus === INCIDENT_STATUSES.RESOLVED || newStatus === INCIDENT_STATUSES.REJECTED) {
      this.complete();
    }
    // @TODO domain events here
  }

  /**
   * Update refund's status. Should not be used alone
   *
   * @param {string} newStatus
   */
  updateRefundStatus(newStatus) {
    this.refundStatus = newStatus;
    // @TODO domain events here
  }

  /**
   * To be used internally to recompute statuses
   * based on child validation statuses
   */
  async computeStatuses() {
    this.computeStatus();
    this.computeRefundStatus();
  }

  /**
   * Implementation of the incident.status finite-state-machine
   */
  async computeStatus() {
    const { attachmentValidations: validations, incidentValidationTypes: validationTypes } = this;

    // incident does not need any document validation
    if (!validationTypes.length) {
      this.updateStatus(INCIDENT_STATUSES.RESOLVED);

      return;
    }

    if (this.status === INCIDENT_STATUSES.CREATED) {
      if (AttachmentValidation.someHaveStarted(validations, validationTypes)) {
        this.updateStatus(INCIDENT_STATUSES.STARTED);
      }
    }

    if (INCIDENT_STARTED_STATUSES.includes(this.status)) {
      if (AttachmentValidation.someHaveRejected(validations, validationTypes)) {
        this.updateStatus(INCIDENT_STATUSES.REJECTED);
      }
      if (AttachmentValidation.allHaveValidated(validations, validationTypes)) {
        this.updateStatus(INCIDENT_STATUSES.RESOLVED);
      }
    }
  }

  /**
   * Implementation of the incident.refundStatus finite-state-machine
   */
  async computeRefundStatus() {
    const { attachmentValidations: validations, refundValidationTypes: validationTypes } = this;

    // a rejection of incident triggers a rejection of refunds
    if (this.status === INCIDENT_STATUSES.REJECTED) {
      this.updateRefundStatus(INCIDENT_REFUND_STATUSES.REJECTED);

      return;
    }

    // refund does not need any document validation
    if (!validationTypes.length) {
      this.updateRefundStatus(
        this.status === INCIDENT_STATUSES.RESOLVED
          ? INCIDENT_REFUND_STATUSES.RESOLVED
          : INCIDENT_REFUND_STATUSES.STARTED
      );

      return;
    }

    if (this.refundStatus === INCIDENT_REFUND_STATUSES.CREATED) {
      if (AttachmentValidation.someHaveStarted(validations, validationTypes)) {
        this.updateRefundStatus(INCIDENT_REFUND_STATUSES.STARTED);
      }
    }

    if (INCIDENT_REFUND_STARTED_STATUSES.includes(this.status)) {
      if (AttachmentValidation.someHaveRejected(validations, validationTypes)) {
        this.updateRefundStatus(INCIDENT_REFUND_STATUSES.REJECTED);
      }
      if (AttachmentValidation.allHaveValidated(validations, validationTypes)) {
        this.updateRefundStatus(
          this.status === INCIDENT_STATUSES.RESOLVED
            ? INCIDENT_REFUND_STATUSES.RESOLVED
            : INCIDENT_REFUND_STATUSES.STARTED
        );
      }
    }
  }

  /**
   * Set selected resolution type
   */
  setSelectedResolutionType() {
    if (this.source !== USER_TYPES.SHIPPER) return;
    this.resolutionTypeSelected = RESOLUTION_TYPES.REFUND;
  }

  /**
   * Set applied resolution type
   *
   * @param {'RESHIP' | 'REFUND' | null} appliedResolution
   */
  setAppliedResolutionType(appliedResolution = null) {
    if (appliedResolution) {
      this.resolutionTypeApplied = appliedResolution;

      if (appliedResolution === RESOLUTION_TYPES.REFUND) {
        this.setDecidedToRefundAt();
      }

      return;
    }

    if (this.source !== USER_TYPES.SHIPPER) return;

    this.resolutionTypeApplied = appliedResolution;
  }

  setDecidedToRefundAt(date = new Date()) {
    this.decidedToRefundAt = date;
  }

  setRefundSentToHeadOfFinanceAt(date = new Date()) {
    this.refundSentToHeadOfFinanceAt = date;
  }

  setRefundSentXMLEndToEnd({ dateTime, docNumber, index }) {
    this.refundSentXMLEndToEndId = `CUBYN-${dateTime}-${docNumber}-${(index + 1)
      .toString()
      // eslint-disable-next-line no-magic-numbers
      .padStart(3, '0')}`;
  }

  setReshipParcelId(id) {
    this.reshipParcelId = id;
  }

  isReshipResolutionSelected() {
    return this.resolutionTypeSelected === RESOLUTION_TYPES.RESHIP;
  }

  isReshipResolutionApplied() {
    return this.resolutionTypeApplied === RESOLUTION_TYPES.RESHIP;
  }

  isRecipientSource() {
    return this.source === USER_TYPES.RECIPIENT;
  }

  isParcelEntityType() {
    return this.entityType === INCIDENT_ENTITY_TYPES.PARCEL;
  }

  shipperId() {
    return this.isRecipientSource() ? this.relatedShipperId : this.ownerId;
  }

  isResolved() {
    if (this.status !== BaseIncident.STATUSES.RESOLVED) return false;
    if (
      this.resolutionTypeApplied === RESOLUTION_TYPES.REFUND &&
      this.refundStatus !== BaseIncident.REFUND_STATUSES.RESOLVED
    )
      return false;

    return true;
  }

  isShipperToRefund() {
    if (!this.hasRefundToDeclare()) return false;
    if (!this.isResolved()) return false;
    if (this.isRecipientSource()) {
      if (!this.isReshipResolutionApplied()) return false;
    }

    return true;
  }

  consumerRefundXML() {
    if (!this.requester || !this.requester.bankInfo) return null;
    const bnkInfo = this.requester.bankInfo;

    return {
      PmtId: {
        EndToEndId: this.refundSentXMLEndToEndId
      },
      Amt: {
        InstdAmt: {
          '@Ccy': 'EUR',
          '#text': this.merchandiseValue
        }
      },
      CdtrAgt: {
        FinInstnId: {
          BIC: bnkInfo.bic.replace(/ /g, '').toUpperCase()
        }
      },
      Cdtr: {
        Nm: bnkInfo.lastName.toUpperCase().trim(),
        PstlAdr: {
          Ctry: bnkInfo.country
        }
      },
      CdtrAcct: {
        Id: {
          IBAN: bnkInfo.iban.replace(/ /g, '').toUpperCase()
        }
      },
      RmtInf: ''
    };
  }
}

// static class properties
BaseIncident.STATUSES = INCIDENT_STATUSES;
BaseIncident.REFUND_STATUSES = INCIDENT_REFUND_STATUSES;
BaseIncident.RESOLUTION_TYPES = RESOLUTION_TYPES;
BaseIncident.ENTITY_TYPES = INCIDENT_ENTITY_TYPES;
BaseIncident.SOURCES = USER_TYPES;

/**
 * @typedef Attachment
 * @type {object}
 * @property {string} type
 * @property {string} fileKey
 */

module.exports = {
  BaseIncident,
  INCIDENT_ATTACHMENT_REJECT_REASON,
  USER_TYPES,
  RESOLUTION_TYPES,
  ORIGIN_TYPES
};
