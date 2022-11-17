const WIO = {
  id: '5873c649-77ba-468e-b305-9d628eea8ee7',
  pid: 948050,
  version: 2,
  warehouseId: 24082363,
  ownerId: 349055631,
  isDeleted: false,
  declaredPackingUnits: 1,
  receivedPackingUnits: 0,
  completedPackingUnits: 0,
  declaredItems: 4,
  storedItems: 0,
  createdAt: '2020-06-30T10:17:54.000Z',
  updatedAt: '2020-06-30T10:17:54.000Z',
  receiptStartedAt: null,
  validatedAt: '2020-06-30T10:17:54.000Z',
  completedAt: null,
  deletedAt: null,
  status: 'VALIDATED',
  fileKey: '/kc1s2b0200080927f5bzb8pj.csv',
  transactionId: 'kc1s2asu000ed4096e5rcqq5',
  deliveriesQuantity: {
    CREATED: 2,
    PROCESSING: 0,
    COMPLETED: 0
  }
};

const WIO_DELIVERIES = [
  {
    id: '00f82b51-f03b-4dd3-8159-0e0cdd5035e9',
    orderId: '5873c649-77ba-468e-b305-9d628eea8ee7',
    status: 'CREATED',
    reference: '1Z1234567891111111',
    warehouseId: 24082363,
    createdAt: '2021-01-15T10:13:07.000Z',
    updatedAt: '2021-01-15T10:13:33.000Z',
    receivedAt: null,
    carrierName: 'UPS',
    carrierTrackingId: '1Z1234567891111111',
    estimatedReceptionDate: '2021-01-21T20:00:00.000Z',
    receivedPackingUnits: 0,
    storedItems: 0,
    declaredPackingUnits: 1
  },
  {
    id: '1cac07cf-b6b6-4bfe-8bd8-2282742aa765',
    orderId: '5873c649-77ba-468e-b305-9d628eea8ee7',
    status: 'COMPLETED',
    reference: '313f7f8c-00ac-43ab-a926-e5200aef6743',
    warehouseId: 24082363,
    createdAt: '2021-01-15T10:14:01.000Z',
    updatedAt: '2021-01-15T10:14:01.000Z',
    receivedAt: '2021-01-15T18:14:01.000Z',
    carrierName: 'Other carrier',
    carrierTrackingId: '313f7f8c-00ac-43ab-a926-e5200aef6743',
    estimatedReceptionDate: '2021-01-15T20:00:00.000Z',
    receivedPackingUnits: 1,
    storedItems: 50,
    declaredPackingUnits: 1
  }
];

const FORMATTED_WIO_DELIVERIES = [
  {
    deliveryId: '00f82b51-f03b-4dd3-8159-0e0cdd5035e9',
    carrier: 'UPS',
    carrierTrackingID: '1Z1234567891111111',
    containersDeclared: 1,
    containersReceived: 0,
    estimatedDeliveryDate: '2021-01-21',
    itemsReceived: 0
  },
  {
    deliveryId: '1cac07cf-b6b6-4bfe-8bd8-2282742aa765',
    carrier: 'Other carrier',
    carrierTrackingID: '313f7f8c-00ac-43ab-a926-e5200aef6743',
    receivedAt: '2021-01-15',
    containersDeclared: 1,
    containersReceived: 1,
    estimatedDeliveryDate: '2021-01-15',
    itemsReceived: 50
  }
];

module.exports = {
  WIO,
  WIO_DELIVERIES,
  FORMATTED_WIO_DELIVERIES
};
