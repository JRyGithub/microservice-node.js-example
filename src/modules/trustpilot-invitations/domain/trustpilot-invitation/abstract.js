const { v4: uuid } = require('uuid');

const STATUSES = {
  TO_DO: 'TO_DO',
  CANCELLED: 'CANCELLED',
  DONE: 'DONE',
  FAILED: 'FAILED'
};

const REASONS = {
  INCIDENT_FOR_PARCEL_EXISTS: 'INCIDENT_FOR_PARCEL_EXISTS',
  SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK: 'SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK',
  PARCEL_DESTINATION_IS_NOT_TRUSTED: 'PARCEL_DESTINATION_IS_NOT_TRUSTED',
  ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT: 'ERROR_COMPOSING_CANCEL_COMPUTATION_CONTEXT',
  ERROR_ON_SEND: 'ERROR_ON_SEND'
};

const ENTITY_TYPES = {
  PARCEL: 'PARCEL'
};

class TrustpilotInvitation {
  static get STATUSES() {
    return STATUSES;
  }

  static get REASONS() {
    return REASONS;
  }

  static get ENTITY_TYPES() {
    return ENTITY_TYPES;
  }

  constructor({
    id,
    firstName,
    lastName,
    email,
    entityType,
    entityId,
    status,
    reason,
    error,
    retriesCount,
    createdAt,
    updatedAt
  }) {
    /**
     * @type {string}
     */
    this.id = id || uuid();
    /**
     * @type {string}
     */
    this.firstName = firstName;
    /**
     * @type {string}
     */
    this.lastName = lastName;
    /**
     * @type {string}
     */
    this.email = email;
    /**
     * @type {keyof ENTITY_TYPES | void}
     */
    this.entityType = entityType;
    /**
     * @type {string | number}
     */
    this.entityId = entityId;
    /**
     * @type {keyof STATUSES}
     */
    this.status = status || STATUSES.TO_DO;
    /**
     * @type {keyof REASONS | void}
     */
    this.reason = reason;
    /**
     * @type {any}
     */
    this.error = error;
    /**
     * @type {number}
     */
    this.retriesCount = retriesCount || 0;
    /**
     * @type {Date}
     */
    this.createdAt = createdAt || new Date();
    /**
     * @type {Date}
     */
    this.updatedAt = updatedAt || new Date();
  }
}

module.exports = { TrustpilotInvitation };
