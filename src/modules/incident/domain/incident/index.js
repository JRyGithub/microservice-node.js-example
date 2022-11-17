const { assert, InvalidIncidentTypeError, ServerError } = require('../../errors');
const { ProductDamagedInWarehouseIncident } = require('./types/product-damaged-in-warehouse');
const { ProductLostInWarehouseIncident } = require('./types/product-lost-in-warehouse');
const { ParcelLateDeliveryIncident } = require('./types/parcel-late-delivery');
const { ParcelNeverReceivedIncident } = require('./types/parcel-never-received');
const { ParcelReceivedDamagedIncident } = require('./types/parcel-received-damaged');
const { ParcelMissingProductIncident } = require('./types/parcel-missing-product');
const { ConsumerReturnIncident } = require('./types/consumer-return');

const { ManualFlowBaseIncident } = require('./manual-flow-base');
const { INCIDENT_ENTITY_TYPES } = require('./constants/incident-entity-type');
const { BaseIncident } = require('./base');
const { AttachmentNotUploadedIncident } = require('./types/attachment-failed-upload');

const IncidentClasses = {
  // manual
  PARCEL_MISSING_PRODUCT: ParcelMissingProductIncident,
  PARCEL_NEVER_RECEIVED: ParcelNeverReceivedIncident,
  PARCEL_RECEIVED_DAMAGED: ParcelReceivedDamagedIncident,
  PARCEL_LATE_DELIVERY: ParcelLateDeliveryIncident,
  RECIPIENT_RETURN_MISSING_PRODUCT: ManualFlowBaseIncident,
  RECIPIENT_RETURN_NEVER_RECEIVED: ManualFlowBaseIncident,
  RECIPIENT_RETURN_RECEIVED_DAMAGED: ManualFlowBaseIncident,
  CONSUMER_RETURN: ConsumerReturnIncident,
  ATTACHMENT_NOT_UPLOADED: AttachmentNotUploadedIncident,
  // automated
  PRODUCT_LOST_IN_WAREHOUSE: ProductLostInWarehouseIncident,
  PRODUCT_DAMAGED_IN_WAREHOUSE: ProductDamagedInWarehouseIncident
};

// IncidentClasses => { INCIDENT_TYPE: 'INCIDENT_TYPE' }
const INCIDENT_TYPES = Object.keys(IncidentClasses).reduce(
  (memo, type) => ({ ...memo, [type]: type }),
  {}
);

const RECIPIENT_INCIDENT_TYPES = [
  INCIDENT_TYPES.PARCEL_MISSING_PRODUCT,
  INCIDENT_TYPES.PARCEL_NEVER_RECEIVED,
  INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
  INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
  INCIDENT_TYPES.CONSUMER_RETURN,
  INCIDENT_TYPES.ATTACHMENT_NOT_UPLOADED
];

// eslint-disable-next-line complexity
const selectEntityType = ({ type, entityType: payloadEntityType } = {}) => {
  let entityType;

  switch (type) {
    case INCIDENT_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE:
    case INCIDENT_TYPES.PRODUCT_LOST_IN_WAREHOUSE:
      entityType = INCIDENT_ENTITY_TYPES.PRODUCT;
      break;
    case INCIDENT_TYPES.PARCEL_MISSING_PRODUCT:
    case INCIDENT_TYPES.PARCEL_NEVER_RECEIVED:
    case INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED:
    case INCIDENT_TYPES.PARCEL_LATE_DELIVERY:
    case INCIDENT_TYPES.RECIPIENT_RETURN_MISSING_PRODUCT:
    case INCIDENT_TYPES.RECIPIENT_RETURN_NEVER_RECEIVED:
    case INCIDENT_TYPES.RECIPIENT_RETURN_RECEIVED_DAMAGED:
    case INCIDENT_TYPES.ATTACHMENT_NOT_UPLOADED:
    case INCIDENT_TYPES.CONSUMER_RETURN:
      entityType = INCIDENT_ENTITY_TYPES.PARCEL;
      break;
    default:
      throw new ServerError('not implemented');
  }

  // for product, we can have ITEM entity type
  if (
    entityType === BaseIncident.ENTITY_TYPES.PRODUCT &&
    payloadEntityType === BaseIncident.ENTITY_TYPES.ITEM
  ) {
    entityType = BaseIncident.ENTITY_TYPES.ITEM;
  }

  return entityType;
};

/**
 * Factory to create specific domain entities by incident type
 *
 * @param {Object} values
 * @param {string} values.type
 * @returns {Incident}
 */
function createIncident(values) {
  const { type } = values;
  assert(type in INCIDENT_TYPES, InvalidIncidentTypeError, type);

  const entityType = selectEntityType(values);

  return new IncidentClasses[type]({ ...values, entityType });
}

module.exports = {
  createIncident,
  selectEntityType,
  INCIDENT_TYPES,
  INCIDENT_ENTITY_TYPES,
  RECIPIENT_INCIDENT_TYPES
};
