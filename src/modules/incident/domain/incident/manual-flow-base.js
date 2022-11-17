/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */
const { assert, BadRequestError } = require('../../errors');
const { BaseIncident, RESOLUTION_TYPES } = require('./base');

class ManualFlowBaseIncident extends BaseIncident {
  constructor(values) {
    super(values, [], []);
    this.isManuallyUpdated = true;
  }

  updateAttachmentValidationStatus(id, status) {
    // do nothing here (not supported by this incident type)
  }

  updateStatus(newStatus) {
    // do nothing here (not supported by this incident type)
  }

  /**
   * Manually reject incident
   * Forbidden by default, unless overriden by incident's child class
   *
   * @param {string} rejectedReason
   */
  forceReject(rejectedReason) {
    assert(this.canForceStatus(), BadRequestError, 'Incident status cannot be updated');
    assert(
      rejectedReason,
      BadRequestError,
      'Missing rejectedReason upon incident forced rejection'
    );

    this.status = BaseIncident.STATUSES.REJECTED;
    this.refundStatus = BaseIncident.REFUND_STATUSES.REJECTED;
    this.rejectedReason = prepareRejectedReason(rejectedReason);
    this.setAppliedResolutionType();
  }

  /**
   * Manually resolve incident
   * Forbidden by default, unless overriden by incident's child class
   *
   * @param {number} shippingFeesAmount
   * @param {number} merchandiseValue
   * @param {'RESHIP' | 'REFUND'} appliedResolution
   * @param {'CREATED' | 'STARTED' | 'RESOLVED' | 'REJECTED'} refundStatus
   */
  forceResolve(details) {
    assert(this.canForceStatus(), BadRequestError, 'Incident status cannot be updated');
    const { appliedResolution = null } = details;
    let { shippingFeesAmount = null, merchandiseValue = null, taxValue = null } = details;

    this.status = BaseIncident.STATUSES.RESOLVED;

    // just make sure that if amounts = 0, we understand them as null values
    shippingFeesAmount = shippingFeesAmount || null;
    merchandiseValue = merchandiseValue || null;
    taxValue = taxValue || null;

    if (shippingFeesAmount || merchandiseValue) {
      this.shippingFeesAmount = shippingFeesAmount;
      this.merchandiseValue = merchandiseValue;
      this.taxValue = taxValue;
      if (!this.isRecipientSource() || appliedResolution === RESOLUTION_TYPES.RESHIP) {
        this.updateRefundStatus(BaseIncident.REFUND_STATUSES.RESOLVED);
      }
    } else {
      this.shippingFeesAmount = null;
      this.merchandiseValue = null;
      this.taxValue = null;
      this.updateRefundStatus(null);
    }
    this.setAppliedResolutionType(appliedResolution);
  }

  /**
   * Checks if manual incident has refund properties declared
   * @returns {boolean}
   */
  hasRefundToDeclare() {
    return this.merchandiseValue || this.shippingFeesAmount;
  }

  /**
   * @returns {boolean}
   */
  canForceStatus() {
    return this.status === BaseIncident.STATUSES.CREATED;
  }
}

/**
 * @param {string | object | void} input stringified JSON or plain object
 * @returns {string | null} stringified array of single rejected reason
 */
function prepareRejectedReason(input) {
  return JSON.stringify([ensureParsedJSON(input)]);
}

/**
 * @param {string | object | void} input stringified JSON or plain object
 * @returns {string | null}
 */
function ensureParsedJSON(input) {
  if (!input) {
    return null;
  }

  try {
    if (typeof input === 'string') {
      return JSON.parse(input);
    }

    return input;
  } catch (error) {
    return null;
  }
}

module.exports = { ManualFlowBaseIncident };
