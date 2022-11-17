/**
 * @interface RefundRepository
 */

const { assert, ServerError } = require('@devcubyn/core.errors');
const {
  Concern: { TYPES, AMOUNT_TYPES, ENTITY_TYPES }
} = require('../../domain/concern');

const { BaseIncident } = require('../../domain/incident/base');

const REFUND_TYPES = {
  MERCHANDISE_REFUND: 'MERCHANDISE_REFUND',
  PARCEL_SHIPPING: 'PARCEL_SHIPPING',
  PARCEL_PETROL_FEE: 'PARCEL_PETROL_FEE'
};

const ALGORITHMS = {
  SUM_EQUALS: 'SUM_EQUALS',
  SUM_PERCENT: 'SUM_PERCENT',
  EQUALS: 'EQUALS'
};

const MAPPING_TYPES = {
  [TYPES.MERCHANDISE]: REFUND_TYPES.MERCHANDISE_REFUND,
  [TYPES.PARCEL_SHIPPING]: REFUND_TYPES.PARCEL_SHIPPING
};
const MAPPING_ALGORITHMS = {
  [AMOUNT_TYPES.VALUE]: ALGORITHMS.SUM_EQUALS,
  [AMOUNT_TYPES.PERCENT]: ALGORITHMS.SUM_PERCENT
};

class RpcRefundRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  async getParcelByConcern(concern) {
    // descructure concern, to get item
    if (!concern || concern.entityType !== ENTITY_TYPES.ITEM) return null;

    const [parcel] =
      (await this.invoke('parcel-picklist.list:v1', {
        filters: { 'items.itemId': concern.entityId }
      })) || [];

    if (!parcel) return null;

    return parcel;
  }

  /**
   * @param {Incident} incident
   * @param {string} incident.entityId
   * @param {BaseIncident.ENTITY_TYPES} incident.entityType
   * @returns {Promise<Object>} id of the refund created
   */
  async getContractByIncident({ entityType, entityId, concerns }) {
    // should be extended for PRODUCT, but as it is something that should be done
    // by other project, this is the temporary solution
    let id;

    switch (entityType) {
      case BaseIncident.ENTITY_TYPES.PARCEL: {
        id = entityId;
        break;
      }
      case BaseIncident.ENTITY_TYPES.PRODUCT: {
        const [concern] = concerns;
        const { parcelId } = (await this.getParcelByConcern(concern)) || {};
        id = parcelId;
        break;
      }
      default: {
        break;
      }
    }

    if (!id) return null;

    const [contract] = (await this.invoke('contracts-from-parcel.list:v1', { id })) || [];

    return contract;
  }

  /**
   * @param {Incident} incident
   * @returns {Promise<number>} id of the refund created
   */
  async createFromIncident(incident) {
    let itemsFromConcerns;

    if (incident.isManuallyUpdated) {
      itemsFromConcerns = manualIncidentToRefundItems(incident);
    } else {
      itemsFromConcerns = incident.concerns.map(concernToRefundItem);
    }

    if (!itemsFromConcerns.length) {
      throw new ServerError('Cannot declare an empty refund');
    }

    const items = itemsFromConcerns.reduce((totalItems, item) => {
      totalItems.push(item);

      // we add the refund on petrol fee only when refund is on parcel shipping in percent
      if (item.type === REFUND_TYPES.PARCEL_SHIPPING && item.algorithm === ALGORITHMS.SUM_PERCENT) {
        totalItems.push({
          ...item,
          type: REFUND_TYPES.PARCEL_PETROL_FEE
        });
      }

      return totalItems;
    }, []);

    if (!incident.shipperId()) {
      throw new ServerError('Cannot create refund with empty user id');
    }

    const { id: contractId } = (await this.getContractByIncident(incident)) || {};

    const { id } = await this.invoke('refund.create:v1', {
      source: 'INCIDENT',
      externalId: incident.id,
      userId: incident.shipperId(),
      contractId,
      items
    });

    return id;
  }
}

function getEntityId(incident) {
  if (incident.entityType !== 'PARCEL') return { entityType: 'USER', entityId: incident.ownerId };
  if (incident.isRecipientSource())
    return { entityType: 'PARCEL', entityId: incident.reshipParcelId };

  return { entityType: 'PARCEL', entityId: incident.entityId };
}

/**
 * @param {Incident} incident
 * @returns {Object}
 */
function manualIncidentToRefundItems(incident) {
  const items = [];

  if (incident.merchandiseValue) {
    items.push({
      ...getEntityId(incident),
      type: REFUND_TYPES.MERCHANDISE_REFUND,
      amount: incident.merchandiseValue,
      // ⚠️ warning: duplicates are thus possible
      algorithm: ALGORITHMS.EQUALS
    });
  }

  if (incident.shippingFeesAmount) {
    assert(
      incident.entityType === 'PARCEL',
      ServerError,
      'Shipping fee refunds are only possible on parcels'
    );

    items.push({
      entityId: incident.entityId,
      entityType: 'PARCEL',
      type: REFUND_TYPES.PARCEL_SHIPPING,
      amount: incident.shippingFeesAmount,
      algorithm: ALGORITHMS.SUM_PERCENT
    });
  }

  return items;
}

/**
 * @param {Concern} concern
 * @returns {Object}
 */
function concernToRefundItem(concern) {
  return {
    entityId: concern.entityId,
    entityType: concern.entityType,
    type: MAPPING_TYPES[concern.type],
    amount: concern.amount,
    algorithm: MAPPING_ALGORITHMS[concern.amountType]
  };
}

module.exports = { RpcRefundRepository };
