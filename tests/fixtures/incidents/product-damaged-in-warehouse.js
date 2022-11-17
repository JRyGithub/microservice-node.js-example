const { INCIDENT, OWNER_ID, REFUND_ID } = require('.');

const PRODUCT = {
  sku: 'PRODUCT-001',
  name: 'My product',
  ownerId: OWNER_ID,
  scubId: 'SCUB-001',
  children: [
    {
      sku: 'PRODUCT-001_DAMAGED',
      name: 'My product',
      flag: 'DAMAGED',
      ownerId: OWNER_ID,
      scubId: 'SCUB-002'
    }
  ]
};

const PRODUCT_DAMAGED_INCIDENT = {
  ...INCIDENT,
  entityId: 'PRODUCT-001',
  entityType: 'PRODUCT',
  type: 'PRODUCT_DAMAGED_IN_WAREHOUSE'
};

const CREATE_INCIDENT_PAYLOAD = {
  ownerId: OWNER_ID,
  entityId: 'PRODUCT-001',
  entityType: 'PRODUCT',
  type: 'PRODUCT_DAMAGED_IN_WAREHOUSE',
  attachments: [
    {
      type: 'BUYING_INVOICE',
      fileKey: 's3://foo/bar'
    }
  ]
};

const CONCERNS = [
  {
    id: 'CONCERN-01',
    entityId: '001',
    entityType: 'ITEM',
    type: 'MERCHANDISE',
    amount: null,
    amountType: null
  },
  {
    id: 'CONCERN-02',
    entityId: '002',
    entityType: 'ITEM',
    type: 'MERCHANDISE',
    amount: null,
    amountType: null
  }
];

const ATTACHMENT_VALIDATIONS = [
  {
    id: 'ATTCH-01',
    type: 'BUYING_INVOICE',
    status: 'VALIDATED',
    outputPayload: { skuValue: 250 }
  }
];

module.exports = {
  OWNER_ID,
  PRODUCT,
  CREATE_INCIDENT_PAYLOAD,
  PRODUCT_DAMAGED_INCIDENT,
  CONCERNS,
  ATTACHMENT_VALIDATIONS,
  REFUND_ID
};
