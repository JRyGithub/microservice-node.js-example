const USER_PID = 52;
const PARCEL_PID = 63;
const COLLECT_PID = 74;
const USER_FIXTURE = { id: 1234567, pid: USER_PID };
const COLLECT_FIXTURE = { id: 1234567, pid: COLLECT_PID };
const TICKET_FIXTURE = {
  comment: 'lorem',
  fileMap: 'lorem',
  reason: 'lorem',
  requester: 'lorem',
  collaborator: 'lorem'
};
const ATTACHMENTS_FIXTURE = [
  {
    type: 'OTHER',
    fileKey: 'lorem',
    status: 'UNDEFINED',
    file: { url: 'lorem' }
  },
  {
    type: 'LABEL',
    status: 'SUCCESS',
    filekey: 'lorem',
    file: { url: 'lorem' }
  },
  {
    type: 'INVOICE',
    status: 'ERROR',
    filekey: null
  }
];
const ATTACHMENT_MAPPING = {
  OTHER: [{ link: ATTACHMENTS_FIXTURE[0].file.url, status: ATTACHMENTS_FIXTURE[0].status }],
  LABEL: [{ link: ATTACHMENTS_FIXTURE[1].file.url, status: ATTACHMENTS_FIXTURE[1].status }],
  INVOICE: [{ link: null, status: ATTACHMENTS_FIXTURE[2].status }]
};
const PARCEL_ITEMS = [
  {
    count: 2,
    reference: 'Test SKU'
  },
  {
    count: 5,
    reference: 'Virtual SKU'
  }
];
const ITEMS_FIXTURE = [
  { id: 1, status: 'STORED', scubId: 1 },
  { id: 2, status: 'STORED', scubId: 2 },
  { id: 3, status: 'MISSING', scubId: 1 }
];
const SCUB = {
  id: '2f17a0ff-6096-43e1-bc6e-f0c0a41e5e82',
  name: 'Product 4BCF0',
  type: 'STANDARD',
  requiresItemIdentifiers: 'NONE',
  pictureFileKey: null,
  weight: 12,
  width: 54,
  height: 43,
  length: 21,
  isBagNeeded: false,
  value: null,
  createdAt: '2020-06-15T12:26:05.000Z',
  updatedAt: '2020-06-15T12:26:06.000Z',
  isMeasured: true
};
const ADDRESS = {
  line1: '3 Test Street',
  line2: null,
  zip: 45000,
  country: 'FR'
};
const PRODUCTS = [
  {
    id: 1,
    sku: 'Test SKU',
    name: 'Test Product'
  }
];
const PRODUCTS_SCUBS = [
  {
    productId: 1,
    scubId: '2f17a0ff-6096-43e1-bc6e-f0c0a41e5e82',
    quantity: 3,
    scub: SCUB,
    product: PRODUCTS[0]
  }
];
const BUNDLE_PRODUCT = {
  id: 1,
  name: 'test',
  sku: 'TEST',
  isBundle: true
};
const BUNDLE_PRODUCTS_SCUBS = [
  {
    productId: 1,
    scubId: '2f17a0ff-6096-43e1-bc6e-f0c0a41e5e82',
    quantity: 1,
    product: BUNDLE_PRODUCT
  },
  {
    productId: 1,
    scubId: '2f17a0ff-6096-43e1-bc6e-f0c0a41e5e83',
    quantity: 1,
    product: BUNDLE_PRODUCT
  }
];
const VALIDATIONS = [];
const PARCEL_FIXTURE = {
  id: 1234567,
  pid: PARCEL_PID,
  firstname: 'Test',
  name: 'Test',
  weight: 500,
  validations: VALIDATIONS,
  items: PARCEL_ITEMS,
  address: ADDRESS,
  via: { classId: null }
};

const INVOICE = {
  id: 1,
  pdfKey: 'pdfLink',
  csvKey: 'csvLink'
};

const GENERAL_DATA = {
  ticketCreatedBy: 'Customer',
  ticketReason: 'lorem',
  carrierReturnAddress: {
    country: 'FR',
    firstName: 'Ines',
    lastName: 'Boutemadja',
    organizationName: 'Cubyn',
    email: 'ines.boutemadja@hec.edu',
    phone: '0617345711',
    line1: '18 rue valentin hauy',
    zip: '75000',
    city: 'Paris',
    line2: 'Bat 2',
    additionalInformation: 'Appt 25'
  },
  recipientReturnAddress: {
    country: 'FR',
    firstName: 'Raph',
    lastName: 'Lec',
    organizationName: 'Cubyn',
    email: 'ines.boutemadja@hec.edu',
    phone: '0617345711',
    line1: '18 rue valentin hauy',
    zip: '75000',
    city: 'Paris'
  },
  shipperReturnAddress: {
    line1: '7 route des Champs Fourgons',
    line2: '',
    city: 'Gennevilliers',
    zip: '92230',
    country: 'FR',
    organizationName: 'Cubyn',
    email: 'help@cubyn.com'
  }
};

const PARCEL_EVENTS = [
  { message: 'woop woop', something: 'noop noop' },
  { message: 'woop woop 2', something: 'noop noop 2' },
  {
    type: 'DELIVERED',
    createdAt: 'Tue Oct 04 2016 21:47:26 GMT+0200 (CEST)'
  },
  {
    type: 'CANCELLED',
    createdAt: 'Tue Oct 04 2020 22:30:26 GMT+0200 (CEST)'
  }
];

const USER_SETTING_FIXTURE = [
  {
    key: 'DEFAULT_CARRIER_RETURN_ADDRESS',
    userId: 745203875,
    value: {
      country: 'FR',
      firstName: 'Ines',
      lastName: 'Boutemadja',
      organizationName: 'Cubyn',
      email: 'ines.boutemadja@hec.edu',
      phone: '0617345711',
      line1: '18 rue valentin hauy',
      zip: '75000',
      city: 'Paris',
      line2: 'Bat 2',
      additionalInformation: 'Appt 25'
    }
  },
  {
    key: 'DEFAULT_RECIPIENT_RETURN_ADDRESS',
    userId: 745203875,
    value: {
      country: 'FR',
      firstName: 'Raph',
      lastName: 'Lec',
      organizationName: 'Cubyn',
      email: 'ines.boutemadja@hec.edu',
      phone: '0617345711',
      line1: '18 rue valentin hauy',
      zip: '75000',
      city: 'Paris'
    }
  },
  {
    key: 'DEFAULT_RETURN_ADDRESS',
    userId: 745203875,
    value: {
      line1: '7 route des Champs Fourgons',
      line2: '',
      city: 'Gennevilliers',
      zip: '92230',
      country: 'FR',
      organizationName: 'Cubyn',
      email: 'help@cubyn.com'
    }
  }
];

module.exports = {
  PARCEL_FIXTURE,
  PRODUCTS,
  PRODUCTS_SCUBS,
  ATTACHMENT_MAPPING,
  ATTACHMENTS_FIXTURE,
  USER_FIXTURE,
  COLLECT_FIXTURE,
  TICKET_FIXTURE,
  USER_PID,
  PARCEL_PID,
  BUNDLE_PRODUCT,
  BUNDLE_PRODUCTS_SCUBS,
  ITEMS_FIXTURE,
  INVOICE,
  GENERAL_DATA,
  PARCEL_EVENTS,
  USER_SETTING_FIXTURE
};
