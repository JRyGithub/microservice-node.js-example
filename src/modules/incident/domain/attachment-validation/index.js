const { v4: uuid } = require('uuid');
const {
  assert,
  InvalidStatusError,
  InvalidAttachmentValidationPayloadError
} = require('../../errors');

const STATUSES = {
  CREATED: 'CREATED',
  STARTED: 'STARTED',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED'
};

const STATUS_VALUES = Object.values(STATUSES);
const STATUSES_STARTED = [STATUSES.STARTED, STATUSES.VALIDATED, STATUSES.REJECTED];

const TYPES = {
  AFFIDAVIT: 'AFFIDAVIT',
  BUYING_INVOICE: 'BUYING_INVOICE',
  COMMERCIAL_INVOICE: 'COMMERCIAL_INVOICE',
  COMPLAINT: 'COMPLAINT',
  GENERAL: 'GENERAL',
  IDENTIFICATION_DOCUMENT: 'IDENTIFICATION_DOCUMENT',
  ITEM_DAMAGED: 'ITEM_DAMAGED',
  POLICE_REPORT: 'POLICE_REPORT'
};

/**
 * One Incident has many AttachmentValidations.
 * AttachmentValidation is an entity tracking the progress of one document-validation.
 * Once an attachment validation has progressed (CREATED → STARTED → RESOLVED), the
 * incident `status` or `refundStatus` might need to be reevaluated.
 */
class AttachmentValidation {
  constructor({ id = uuid(), type, status = STATUSES.CREATED, payload = null, ...values }) {
    // assert(TYPE_VALUES.includes(type), InvalidTypeError, type, TYPE_VALUES);
    assert(STATUS_VALUES.includes(status), InvalidStatusError, status, STATUS_VALUES);

    this.id = id;
    this.type = type;
    this.status = status;
    this.payload = payload;

    Object.assign(this, values);
  }

  static someHaveStarted(validations, types = false) {
    return AttachmentValidation.filterValidations(validations, types).some(({ status }) =>
      STATUSES_STARTED.includes(status)
    );
  }

  static allHaveValidated(validations, types = false) {
    return AttachmentValidation.filterValidations(validations, types).every(
      ({ status }) => STATUSES.VALIDATED === status
    );
  }

  static someHaveRejected(validations, types = false) {
    return AttachmentValidation.filterValidations(validations, types).some(
      ({ status }) => STATUSES.REJECTED === status
    );
  }

  static filterValidations(validations, types = false) {
    if (types === false) {
      return validations;
    }

    return (validations || []).filter(({ type }) => types.includes(type));
  }

  /**
   * @param {string} status
   * @param {Object} payload specific to each attachment validation type
   *      should only be given when status is set to VALIDATED
   */
  setStatus(status, payload = null) {
    assert(STATUS_VALUES.includes(status), InvalidStatusError, status, STATUS_VALUES);

    if (status === STATUSES.VALIDATED) {
      assert(
        this.isPayloadValid(payload),
        InvalidAttachmentValidationPayloadError,
        this.type,
        payload
      );
      this.payload = payload;
    }

    this.status = status;
  }

  /**
   * Inspect given payload for all required properties to compute
   * subsequent billing refunds
   *
   * @param {Object} payload
   * @returns {boolean}
   */
  isPayloadValid(payload) {
    switch (this.type) {
      case TYPES.BUYING_INVOICE:
        return !!payload && !!payload.skuValue && !Number.isNaN(Number(payload.skuValue));
      default:
        return true;
    }
  }
}

// static class property
AttachmentValidation.STATUSES = STATUSES;
AttachmentValidation.TYPES = TYPES;

module.exports = { AttachmentValidation };
