/* eslint-disable complexity */
const { assert, ResourceNotFoundError } = require('@devcubyn/core.errors');
const {
  TYPES,
  ORDER_EVENTS_TYPES,
  PARCEL_EVENT_TYPES
} = require('../modules/models/entity-type/constants');

const RETURN_ADDRESSES = [
  'DEFAULT_CARRIER_RETURN_ADDRESS',
  'DEFAULT_RECIPIENT_RETURN_ADDRESS',
  'DEFAULT_RETURN_ADDRESS'
];

const ADDRESSES_MAPPING = {
  DEFAULT_CARRIER_RETURN_ADDRESS: 'carrierReturnAddress',
  DEFAULT_RECIPIENT_RETURN_ADDRESS: 'recipientReturnAddress',
  DEFAULT_RETURN_ADDRESS: 'shipperReturnAddress'
};

const getGeneralData = async ({ type, reason, invoke, userId }) => {
  const results = await invoke('user-setting.list:v1', {
    filters: { key: RETURN_ADDRESSES, userId }
  });

  const returnAddresses = results.reduce(
    (acc, result) => {
      const returnAddressType = result.key;
      const address = result.value;

      acc[ADDRESSES_MAPPING[returnAddressType]] = address;

      return acc;
    },
    { carrierReturnAddress: null, recipientReturnAddress: null, shipperReturnAddress: null }
  );

  return {
    ticketType: type,
    ticketReason: reason,
    ticketCreatedBy: 'Customer',
    ...returnAddresses
  };
};

const getOrderData = async ({ referenceId, invoke, context, collectId = null }) => {
  let parcelData = await invoke('parcel.read:v1', {
    filters: { id: referenceId },
    includes: [
      'parcel.admin',
      'parcel.details',
      'parcel.validations',
      'parcel.picklist',
      'parcel.via',
      'parcel.pii'
    ],
    context
  });

  assert(parcelData, ResourceNotFoundError, 'Parcel data not found', referenceId);

  if (parcelData.items && parcelData.items.length) {
    const skus = parcelData.items.map(({ reference }) => reference);
    const products = await invoke('product-catalog__product.list:v1', {
      filters: {
        sku: skus
      },
      context
    });

    if (products && products.length) {
      const productIds = products.map(({ id }) => id);
      const productScubs = await invoke('product-catalog__product-scub.list:v1', {
        filters: {
          productId: productIds
        },
        includes: ['product_scub.scub', 'product_scub.product'],
        context
      });

      if (productScubs && productScubs.length) {
        const skuScubs = productScubs.reduce(
          (acc, { quantity, product: { sku }, scub: { weight: scubWeight } }) => {
            const weight = quantity * scubWeight;

            if (!acc[sku]) {
              return {
                ...acc,
                [sku]: weight
              };
            }
            acc[sku] += weight;

            return acc;
          },
          {}
        );

        const totalWeight = parcelData.items.reduce((acc, item) => {
          // Virtual skus don't have related scubs
          if (!skuScubs[item.reference]) {
            return acc;
          }

          return acc + item.count * skuScubs[item.reference];
        }, 0);

        parcelData = {
          ...parcelData,
          totalWeight
        };
      }
    }
  }

  const attachmentList = await invoke('attachment.list:v1', {
    filters: { parcelId: referenceId },
    includes: ['attachment.file'],
    // Set link expiry for 7 days
    // eslint-disable-next-line no-magic-numbers
    ttl: 60 * 60 * 24 * 7
  });

  if (attachmentList.length) {
    const attachments = attachmentList.reduce((acc, attachment) => {
      const { file: { url } = { url: null }, status } = attachment;

      if (!acc[attachment.type]) {
        return { ...acc, [attachment.type]: [{ link: url, status }] };
      }
      acc[attachment.type].push({ link: url, status });

      return acc;
    }, {});
    parcelData = {
      ...parcelData,
      attachments
    };
  }

  const parcelEvents = await invoke('parcel-event.list:v1', {
    filters: {
      parcelId: referenceId,
      type: ORDER_EVENTS_TYPES
    },
    sort: { updatedAt: 'desc' }
  });

  const deliveredEvent = parcelEvents.find((event) => event.type === PARCEL_EVENT_TYPES.DELIVERED);
  const lastParcelEvent = parcelEvents.length ? parcelEvents[0] : null;
  const cancelledAtEvent = parcelEvents.find(
    (event) => event.type === PARCEL_EVENT_TYPES.CANCELLED
  );

  return {
    ...parcelData,
    collectId,
    deliveredAt: deliveredEvent ? deliveredEvent.createdAt : null,
    lastEventMessage: lastParcelEvent ? lastParcelEvent.message : null,
    cancelledAt: cancelledAtEvent ? cancelledAtEvent.createdAt : null
  };
};

const getInvoiceData = async ({ referenceId, invoke }) => {
  const invoiceData = await invoke('invoice.read:v1', {
    filters: { id: referenceId }
  });

  assert(invoiceData, ResourceNotFoundError, 'Invoice data not found', referenceId);

  return invoiceData;
};

const getWioData = async ({ referenceId, invoke }) => {
  // Use list instead of read to include lines
  const wioData = await invoke('storage-inbound__order.list:v1', {
    filters: { pid: referenceId },
    includes: ['lines', 'deliveriesQuantity'],
    limit: 1
  });

  assert(wioData && wioData.length, ResourceNotFoundError, 'WIO data not found', referenceId);

  const [wio] = wioData;
  const {
    id,
    deliveriesQuantity: { CREATED, COMPLETED, PROCESSING } = {
      CREATED: 0,
      COMPLETED: 0,
      PROCESSING: 0
    }
  } = wio;

  if (CREATED > 0 || COMPLETED > 0 || PROCESSING > 0) {
    // since we have deliveries we need to fetch it
    wio.deliveries = await invoke('storage-inbound__delivery.list:v1', {
      filters: { orderId: id }
    });
  }

  return wio;
};

const getSkuData = async ({ referenceId, invoke }) => {
  const productScubs = await invoke('product-catalog__product-scub.list:v1', {
    filters: {
      productId: referenceId
    },
    includes: ['product_scub.product']
  });

  assert(
    productScubs && productScubs.length,
    ResourceNotFoundError,
    'Product related scubs not found',
    referenceId
  );

  const [
    {
      product: { isBundle, name, sku }
    }
  ] = productScubs;
  const scubIds = productScubs.map(({ scubId }) => scubId);
  const items = await invoke('item.list:v1', { filters: { scubId: scubIds } });

  assert(items && items.length, ResourceNotFoundError, 'Product related items not found', scubIds);

  const quantities = items.reduce((acc, { status, scubId }) => {
    if (!acc[scubId]) {
      // eslint-disable-next-line no-param-reassign
      acc = {
        ...acc,
        [scubId]: { scubId }
      };
    }
    if (!acc[scubId][status]) {
      return {
        ...acc,
        [scubId]: { ...acc[scubId], [status]: 1 }
      };
    }
    acc[scubId][status]++;

    return acc;
  }, {});

  return {
    id: referenceId,
    quantityPerStatus: { name, sku, isBundle, quantities: Object.values(quantities) }
  };
};

async function handler(
  { data, reason, invoke, context },
  appendUserData = true,
  appendGeneralData = false
) {
  const { userId, type, referenceId } = data;
  const information = {
    user: appendUserData
      ? await invoke('user.read:v1', { filters: { id: userId }, includes: ['user.admin'] })
      : null,
    generalData: appendGeneralData ? await getGeneralData({ type, reason, invoke, userId }) : null,
    entityData: null
  };

  switch (type) {
    case TYPES.ORDER:
    case TYPES.RETURN_ORDER:
      information.entityData = await getOrderData({ referenceId, invoke, context });
      break;
    case TYPES.WIO:
      information.entityData = await getWioData({ referenceId, invoke, context });
      break;
    case TYPES.INVOICE:
      information.entityData = await getInvoiceData({ referenceId, invoke, context });
      break;
    case TYPES.SKU:
      information.entityData = await getSkuData({ referenceId, invoke, context });
      break;
    default:
      return null;
  }

  return information;
}

module.exports = handler;
