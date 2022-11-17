const { assert } = require('@devcubyn/core.errors');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');
const {
  PARCEL_STATUS_CARRIER_DELIVERED,
  PARCEL_TYPE_DUPLICATE
} = require('../../../core/constants/parcels');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
// eslint-disable-next-line no-unused-vars
const { ParcelResolveEngine } = require('../../engines/parcel-resolve');
const {
  ParcelIsNotDeliveredTICError,
  ParcelNotFoundTICError,
  ParcelDestinationIsNotTrustedTICError,
  ParcelIsNotValidTICError,
  ShipperNotFoundTICError,
  ShipperIsNotAPartOfDeliveryNetworkTICError
} = require('../../errors');

/**
 * Creates invitation
 */
class CreateTrustpilotInvitationUsecase {
  /**
   * @param {Object} param
   * @param {TrustpilotInvitationRepository} param.trustpilotInvitationRepository
   * @param {UserRepository} param.userRepository
   * @param {ParcelResolveEngine} param.parcelResolveEngine
   */
  constructor({ trustpilotInvitationRepository, userRepository, parcelResolveEngine, envHost }) {
    this.trustpilotInvitationRepository = trustpilotInvitationRepository;
    this.userRepository = userRepository;
    this.parcelResolveEngine = parcelResolveEngine;
    this.envHost = envHost;
  }

  /**
   * @param {Object} param
   * @param {string | number} param.entityId
   * @param {keyof TrustpilotInvitation.ENTITY_TYPES} param.entityType
   * @param {Partial<Parcel> | Partial<Incident> | void} param.partialEntity
   */
  async execute({ entityId, entityType, partialEntity }) {
    if (entityType === TrustpilotInvitation.ENTITY_TYPES.PARCEL) {
      assert(
        partialEntity.status === PARCEL_STATUS_CARRIER_DELIVERED,
        ParcelIsNotDeliveredTICError,
        {
          partialEntity
        }
      );
    }

    const parcel = await this.parcelResolveEngine.resolve({ entityId, entityType });
    assert(parcel, ParcelNotFoundTICError, { entityId, entityType });
    assert(parcel.isTrustedDestination, ParcelDestinationIsNotTrustedTICError, { parcel });

    const parcelValid = this.validateParcel(parcel);
    assert(parcelValid, ParcelIsNotValidTICError, { parcel });

    const shipper = await this.userRepository.findOneById(parcel.shipperId);
    assert(shipper, ShipperNotFoundTICError, { shipperId: parcel.shipperId, parcel });
    assert(
      shipper.salesCategory === USER_SALES_CATEGORY_DELIVERY_NETWORK,
      ShipperIsNotAPartOfDeliveryNetworkTICError,
      { shipper, parcel }
    );

    const tpInvite = createTrustpilotInvitation({
      entityId,
      entityType,
      firstName: parcel.firstName,
      lastName: parcel.lastName,
      email: parcel.email
    });

    await this.trustpilotInvitationRepository.create(tpInvite);

    return tpInvite.id;
  }

  /**
   * @private
   * @param {Parcel} parcel
   * @returns {boolean}
   */
  validateParcel(parcel) {
    const { TRUSTPILOT_SHIPPER_BLACKLIST = '' } = this.envHost.get();

    if (
      !parcel.email ||
      !parcel.firstName ||
      !parcel.lastName ||
      parcel.type === PARCEL_TYPE_DUPLICATE ||
      TRUSTPILOT_SHIPPER_BLACKLIST.split(',').includes(parcel.shipperId.toString())
    ) {
      return false;
    }

    return true;
  }
}

module.exports = { CreateTrustpilotInvitationUsecase };
