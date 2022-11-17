/* eslint-disable max-classes-per-file */
const REASONS = {
  INCIDENT_IS_NOT_RESOLVED: 'INCIDENT_IS_NOT_RESOLVED',
  INCIDENT_ENTITY_TYPE_IS_NOT_PARCEL: 'INCIDENT_ENTITY_TYPE_IS_NOT_PARCEL',
  PARCEL_IS_NOT_DELIVERED: 'PARCEL_IS_NOT_DELIVERED',
  PARCEL_NOT_FOUND: 'PARCEL_NOT_FOUND',
  PARCEL_DESTINATION_IS_NOT_TRUSTED: 'PARCEL_DESTINATION_IS_NOT_TRUSTED',
  PARCEL_IS_NOT_VALID: 'PARCEL_IS_NOT_VALID',
  SHIPPER_NOT_FOUND: 'SHIPPER_NOT_FOUND',
  SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK: 'SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK'
};

class TrustpilotInvitationCreationError extends Error {
  static get REASONS() {
    return REASONS;
  }

  /**
   * @param {keyof TrustpilotInvitationCreationError.REASONS} reason
   * @param {T | void} extras
   */
  constructor(reason, extras = {}) {
    super('Trustpilot invitation creation error');
    this.reason = reason;
    this.extras = extras;
  }
}

class ParcelIsNotDeliveredTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(TrustpilotInvitationCreationError.REASONS.PARCEL_IS_NOT_DELIVERED, extras);
  }
}

class ParcelNotFoundTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(TrustpilotInvitationCreationError.REASONS.PARCEL_NOT_FOUND, extras);
  }
}

class ParcelDestinationIsNotTrustedTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(TrustpilotInvitationCreationError.REASONS.PARCEL_DESTINATION_IS_NOT_TRUSTED, extras);
  }
}

class ParcelIsNotValidTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(TrustpilotInvitationCreationError.REASONS.PARCEL_IS_NOT_VALID, extras);
  }
}

class ShipperNotFoundTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(TrustpilotInvitationCreationError.REASONS.SHIPPER_NOT_FOUND, extras);
  }
}

class ShipperIsNotAPartOfDeliveryNetworkTICError extends TrustpilotInvitationCreationError {
  constructor(extras) {
    super(
      TrustpilotInvitationCreationError.REASONS.SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK,
      extras
    );
  }
}

module.exports = {
  TrustpilotInvitationCreationError,
  ParcelIsNotDeliveredTICError,
  ParcelNotFoundTICError,
  ParcelDestinationIsNotTrustedTICError,
  ParcelIsNotValidTICError,
  ShipperNotFoundTICError,
  ShipperIsNotAPartOfDeliveryNetworkTICError
};
