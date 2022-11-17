const BUYING_INVOICE_PAYLOAD = {
  isInvoiceWordExists: true,
  invoiceNumber: '123',
  invoiceDate: '2021-01-01',
  skuValue: 50,
  isSellerNameAndAddressExists: true,
  isBuyerNameExists: true,
  isSkuNameExists: true
};

const COMMERCIAL_INVOICE_PAYLOAD = {
  isInvoiceWordExists: true,
  invoiceNumber: '123',
  isCompanyNameAndAddressExists: true,
  isRecipientNameAndAddressExists: true,
  invoiceDate: '2021-01-01',
  reference: '123',
  products: { sku: 'SKU_NAME', skuValue: 123 }
};

const IDENTIFICATION_DOCUMENT_PAYLOAD = {
  isNameExists: true,
  expiryDate: '2020-01-01'
};

const AFFIDAVIT_PAYLOAD = {
  isAuthorNameExists: true,
  reference: '123',
  isValidReason: true,
  isAffidavitSigned: true,
  affidavitDate: '2021-01-01'
};

const POLICE_REPORT_PAYLOAD = {
  isAuthorNameExists: true,
  reference: '123',
  isValidReason: true,
  isAuthorSigned: true,
  isPoliceOfficerSigned: true,
  pageTotal: 10,
  reportPoliceDate: '2021-01-01'
};

module.exports = {
  BUYING_INVOICE_PAYLOAD,
  COMMERCIAL_INVOICE_PAYLOAD,
  IDENTIFICATION_DOCUMENT_PAYLOAD,
  AFFIDAVIT_PAYLOAD,
  POLICE_REPORT_PAYLOAD
};
