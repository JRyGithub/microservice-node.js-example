const { BaseIncident, RESOLUTION_TYPES, USER_TYPES } = require('../../domain/incident/base');
const { ResourceNotFoundError, InvalidStatusError } = require('../../errors');
const { INCIDENT_TYPES } = require('../../domain/incident');

/**
 * Force completion of an incident (resolve or reject).
 * This can only be done on incidents that are not (yet) automated.
 *
 * In case of a resolution, it will create refunds on billing side if necessary.
 *
 * @param {Object} params
 * @param {IncidentRepository} params.incidentRepository
 * @param {RefundRepository} params.refundRepository
 * @param {ParcelRepository} params.parcelRepository
 * @param {IncidentAppliedResolutionService} params.incidentAppliedResolutionService
 */
function forceCompleteIncidentUsecase({
  incidentRepository,
  refundRepository,
  parcelRepository,
  productRepository,
  incidentAppliedResolutionService,
  messageRepository
}) {
  return {
    incidentRepository,
    refundRepository,
    parcelRepository,
    productRepository,
    incidentAppliedResolutionService,
    messageRepository,

    /**
     * @param {UpdateIncidentStatusDTO} payload
     * @param {string} payload.id
     * @param {string} payload.status
     * @param {string} payload.rejectedReason mandatory when status = REJECTED
     * @param {number} payload.merchandiseValue ignored when status = REJECTED
     * @param {number} payload.shippingFeesAmount ignored when status = REJECTED
     * @return {Promise<object>} incident
     */
    async execute({
      id,
      status,
      rejectedReason,
      merchandiseValue,
      taxValue,
      shippingFeesAmount,
      applicationId
    }) {
      const incident = await incidentRepository.findById(id);

      if (!incident) {
        throw new ResourceNotFoundError('Incident', id);
      }

      if (status === BaseIncident.STATUSES.REJECTED) {
        incident.forceReject(rejectedReason);
      } else if (status === BaseIncident.STATUSES.RESOLVED) {
        let appliedResolution = RESOLUTION_TYPES.REFUND;
        let recipientCountry = '';

        if (incident.isRecipientSource()) {
          const resolutionResult = await this.incidentAppliedResolutionService.resolve({
            incident
          });
          appliedResolution = resolutionResult.appliedResolution;
          resolutionResult.parcel.viaApplicationId = applicationId;
          if (resolutionResult.parcel.address) {
            recipientCountry = resolutionResult.parcel.address.country;
          }

          if (appliedResolution === RESOLUTION_TYPES.RESHIP) {
            await this.handleReshipResolution(resolutionResult);
          }
        }

        incident.forceResolve({
          merchandiseValue,
          taxValue,
          shippingFeesAmount,
          appliedResolution,
          recipientCountry
        });
      } else {
        throw new InvalidStatusError(status, [
          BaseIncident.STATUSES.REJECTED,
          BaseIncident.STATUSES.RESOLVED
        ]);
      }

      if (incident.isShipperToRefund()) {
        const refundId = await refundRepository.createFromIncident(incident);
        incident.setRefundId(refundId);
      }

      await incidentRepository.update(incident);

      return incident;
    },

    /**
     * Performs operations to properly handle RESHIP.
     * Optionally returns its result
     *
     * @param {AppliedResolutionResolutionResult} resolutionResult
     */
    async handleReshipResolution({ incident, parcel }) {
      /**
       * TODO: extract selectively missing scubs/items once requirements are clear
       * & data provided by recipient
       */
      const reshippedParcel = await this.parcelRepository.clone(parcel);
      incident.setReshipParcelId(reshippedParcel.id);
    },

    /**
     * @param {object} payload
     * @param {string} payload.source
     * @param {string} payload.status
     * @param {string} payload.rejectedReason this is a string, but should be parsed to array
     * @param {'REFUND' | 'RESHIP'} payload.resolutionTypeApplied
     * @param {'REFUND' | 'RESHIP'} payload.resolutionTypeSelected
     * @param {RequesterDTO} payload.requester
     * @return {Promise<void>}
     */
    async notify(incident) {
      const { source, type, status, resolutionTypeApplied, resolutionTypeSelected } = incident;

      if (source !== USER_TYPES.RECIPIENT) return;
      // claim is rejected
      if (status === BaseIncident.STATUSES.REJECTED) {
        await messageRepository.claimRejected(incident);

        return;
      }

      if (!resolutionTypeApplied) return;

      // claim is resolved
      if (resolutionTypeSelected === resolutionTypeApplied) {
        if (type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY) {
          await messageRepository.claimResolvedLate(incident);

          return;
        }

        const { reshipParcelId, concerns, entityId } = incident;

        const parcel = await parcelRepository.findById({
          id: reshipParcelId || entityId,
          includes: ['parcel.admin']
        });

        const products =
          (await productRepository.findByIds(concerns.map((concern) => concern.entityId))) || [];

        const emailProducts = products.map((product) => {
          const concern = concerns.find((cncrn) => cncrn.entityId === product.id);
          const quantity = concern ? concern.quantity : 0;

          return `${quantity} x ${product.name}`;
        });

        await messageRepository.claimResolved(incident, parcel, emailProducts);

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
 * @typedef UpdateIncidentStatusDTO
 * @type {object}
 * @property {string} id
 * @property {string} status
 */

/**
 * @interface IncidentRepository
 */

/**
 * Returns the fully hydrated incident
 *
 * @function
 * @name IncidentRepository#findById
 * @property {string} id
 * @returns {Promise<Incident | null>}
 */

/**
 * Update only top level properties of this incident model
 *
 * @function
 * @name IncidentRepository#update
 * @property {Incident} incident
 * @returns {Promise<void>}
 */

/**
 * Returns parcel with given id, or `null` if not found
 *
 * @function
 * @name ParcelRepository#findById
 * @property {string} id
 * @returns {Promise<Parcel | null>}
 */

/**
 * Returns products with given ids
 *
 * @function
 * @name ProductRepository#findByIds
 * @property {string[]} ids
 * @returns {Promise<Product[]>}
 */

/**
 * @typedef AppliedResolutionResolutionResult
 * @property {Parcel} parcel
 * @property {ParcelPicklist[]} parcelPicklists
 * @property {Map<string, number>} scubIdToReshipQuantityMap Map of scubId to its quantity
 * @property {'RESHIP' | 'REFUND'} appliedResolution
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

module.exports = { forceCompleteIncidentUsecase };
