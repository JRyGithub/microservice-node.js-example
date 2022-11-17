const logger = require('@devcubyn/core.logger');

const SHORT_MERCHANT_NAME_LENGTH = 7;

const ONLINE_BRANDS_ID = {
  Shopify: 1,
  Prestashop: 2,
  APICubyn: 3,
  Magento: 4,
  Woocommerce: 5
};

const MARKETPLACE_ID = {
  PriceMinister: 6,
  Backmarket: 7,
  Rakuten: 8,
  Amazon: 9,
  Fnac: 10,
  Mirakl: 11
};

/**
 * 1 Shopify
 * 2 Prestashop
 * 3 API Cubyn
 * 4 Magento
 * 5 Woocommerce
 */
const ONLINE_BRANDS_APP_CLASS_IDS_SET = new Set(Object.values(ONLINE_BRANDS_ID));
/**
 * 6 PriceMinister
 * 7 Backmarket
 * 8 Rakuten
 * 9 Amazon
 * 10 Fnac
 * 11 Mirakl
 */
const MARKETPLACE_APP_CLASS_IDS_SET = new Set(Object.values(MARKETPLACE_ID));

/**
 * @param {object} param0
 * @param {{ id: number, classId: number, class: { name: string } }} param0.app
 * @param {{ id: number, organizationName: string }} param0.shipper
 * @returns {string}
 */
function formatMerchantName({ app, shipper }) {
  let merchantName;

  // eslint-disable-next-line no-undefined
  if (app.classId !== undefined) {
    const classId = parseInt(app.classId, 10);

    if (MARKETPLACE_APP_CLASS_IDS_SET.has(classId)) {
      merchantName = app.class.name;
    } else if (ONLINE_BRANDS_APP_CLASS_IDS_SET.has(classId)) {
      merchantName = shipper.organizationName;
    } else {
      logger.warn(`Unknown classId ${classId} for app ${app.id}`);
    }
  }

  if (!merchantName) {
    logger.warn(`Empty merchant name for shipper ${shipper.id} via app ${app.id}`);

    return app.name;
  }

  return merchantName;
}

/**
 * Truncate input and add a horizontal ellipsis (U+2026) at the end
 * if the input's length is greater than SHORT_MERCHANT_NAME_LENGTH
 * @param {string} merchantName
 * @returns {string}
 */
function truncateMerchantName(merchantName) {
  if (merchantName.length > SHORT_MERCHANT_NAME_LENGTH) {
    return `${merchantName.slice(0, SHORT_MERCHANT_NAME_LENGTH - 1)}…`;
  }

  return merchantName;
}

module.exports = {
  formatMerchantName,
  truncateMerchantName
};
