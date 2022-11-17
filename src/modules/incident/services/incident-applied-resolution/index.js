/* eslint-disable class-methods-use-this */
const { assert, ResourceNotFoundError } = require('@devcubyn/core.errors');
const { RESOLUTION_TYPES } = require('../../domain/incident/base');
const { INCIDENT_ENTITY_TYPES } = require('../../domain/incident/constants/incident-entity-type');
const { PARCEL_TYPE_DUPLICATE } = require('../../../core/constants/parcels');

class IncidentAppliedResolutionService {
  constructor({
    parcelRepository,
    productRepository,
    parcelPicklistRepository,
    scubStockInfoRepository
  }) {
    this.parcelRepository = parcelRepository;
    this.productRepository = productRepository;
    this.parcelPicklistRepository = parcelPicklistRepository;
    this.scubStockInfoRepository = scubStockInfoRepository;
  }

  /**
   * @public
   *
   * @param {Object} payload
   * @param {Incident} payload.incident
   *
   * @returns {AppliedResolutionResolutionResult}
   */
  async resolve({ incident }) {
    const { entityId, concerns } = incident;
    const parcel = await this.parcelRepository.findById({
      id: entityId,
      includes: ['parcel.admin', 'parcel.pii', 'parcel.details', 'originalParcel']
    });
    let parcelId = parcel.id;

    if (parcel.type === PARCEL_TYPE_DUPLICATE) {
      const { originalParcel } = parcel;
      const { id } = originalParcel;
      parcelId = id;

      assert(
        parcelId,
        ResourceNotFoundError,
        'orginalParcelId not found for this duplicate parcel'
      );
    }

    const parcelPicklist = await this.parcelPicklistRepository.findOneByParcelId(parcelId);

    assert(parcelPicklist, ResourceNotFoundError, 'Parcel picklist not found', parcelId);

    const { concernedItems, concernedPicklistLineIds } = this.concerned(parcelPicklist, concerns);

    const scubIdToReshipQuantityMap = this.extractScubIdToQuantityMapFromParcelPicklist(
      parcelPicklist,
      concernedPicklistLineIds
    );
    const scubIds = Array.from(scubIdToReshipQuantityMap.keys());
    const scubsStockInfos = await this.scubStockInfoRepository.findByScubIdsAndWarehouseId(
      scubIds,
      parcel.warehouseId
    );
    const scubIdToAvailableQuantityMap =
      this.extractScubIdToQuantityMapFromScubStockInfos(scubsStockInfos);
    const hasEnoughScubsToReship = this.checkScubToReshipAvailability(
      scubIdToReshipQuantityMap,
      scubIdToAvailableQuantityMap
    );

    const appliedResolution =
      incident.isReshipResolutionSelected() && hasEnoughScubsToReship
        ? RESOLUTION_TYPES.RESHIP
        : RESOLUTION_TYPES.REFUND;

    return {
      incident,
      parcel: { ...parcel, items: concernedItems },
      parcelPicklists: parcelPicklist,
      scubIdToReshipQuantityMap,
      hasEnoughScubsToReship,
      appliedResolution
    };
  }

  concerned(parcelPicklist, concerns) {
    const lines = parcelPicklist.lines || [];
    const { concernedPicklistLineIds, concernedItems } = lines.reduce((prev, line) => {
      const concernedProduct = concerns.find(
        (concern) =>
          concern.entityId === line.productId &&
          concern.entityType === INCIDENT_ENTITY_TYPES.PRODUCT
      );

      if (!concernedProduct) return prev;
      // eslint-disable-next-line no-param-reassign
      prev.concernedPicklistLineIds = [...(prev.concernedPicklistLineIds || []), line.id];
      // eslint-disable-next-line no-param-reassign
      prev.concernedItems = [
        ...(prev.concernedItems || []),
        {
          reference: line.reference,
          count: concernedProduct.quantity
        }
      ];

      return prev;
    }, {});

    return {
      concernedItems,
      concernedPicklistLineIds
    };
  }

  /**
   * @private
   *
   * @param {ParcelPicklist} parcelPicklist
   * @returns {Map<string, number>} Map of scubId to its quantity
   */
  extractScubIdToQuantityMapFromParcelPicklist(parcelPicklist, concernedPicklistLineIds) {
    const map = new Map();

    if (!concernedPicklistLineIds) return map;

    const scubs = parcelPicklist.scubs.filter((scub) =>
      concernedPicklistLineIds.includes(scub.picklistLineId)
    );

    scubs.forEach(({ scubId, quantity }) => {
      if (!map.has(scubId)) {
        map.set(scubId, 0);
      }

      const currentQuantity = map.get(scubId);

      map.set(scubId, currentQuantity + (quantity || 1));
    });

    return map;
  }

  /**
   * @private
   *
   * @param {ScubStockInfo[]} scubStockInfos
   * @returns {Map<string, number>} Map of scubId to its quantity
   */
  extractScubIdToQuantityMapFromScubStockInfos(scubStockInfos) {
    return scubStockInfos.reduce((map, { scubId, quantityAvailable }) => {
      if (!map.has(scubId)) {
        map.set(scubId, 0);
      }

      const currentQuantity = map.get(scubId);

      map.set(scubId, currentQuantity + quantityAvailable);

      return map;
    }, new Map());
  }

  /**
   * Checks if stock has equal or greater amount
   * of scubs to be reshipped
   *
   * @private
   *
   * @param {Map<string, number>} scubIdToReshipQuantityMap
   * @param {Map<string, number>} scubIdToAvailableQuantityMap
   * @returns {boolean}
   */
  checkScubToReshipAvailability(scubIdToReshipQuantityMap, scubIdToAvailableQuantityMap) {
    const scubIdToReshipQuantityEntries = Array.from(scubIdToReshipQuantityMap.entries());

    for (const [scubId, reshipQuantity] of scubIdToReshipQuantityEntries) {
      if (!scubIdToAvailableQuantityMap.has(scubId)) {
        return false;
      }

      const availableQuantity = scubIdToAvailableQuantityMap.get(scubId);

      if (availableQuantity < reshipQuantity) {
        return false;
      }
    }

    return true;
  }
}

module.exports = { IncidentAppliedResolutionService };
