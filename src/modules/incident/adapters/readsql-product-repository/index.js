const globalLogger = require('../../../../drivers/logger');
const { findProductById } = require('./queries/find-product-by-id');
const { findScubs } = require('./queries/find-scubs');

const LOGGER_PREFIX = '[READSQL_PRODUCT] ';

/**
 * @FIXME
 * Quick and __dirty__ repository to access product definitions
 * using a read sql connection directly. To be replaced by dedicated projections
 * and/or lambda rpc calls
 *
 * @interface ProductRepository
 */
class ReadsqlProductRepository {
  constructor(context, { logger = globalLogger } = {}) {
    this.context = context;
    this.logger = logger;
  }

  /**
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    this.log('findById: query', { id });
    const product = await findProductById(id);

    if (!product) {
      return null;
    }

    await this.hydateScubInfo(product);

    this.log('findById: result', { product });

    return product;
  }

  // eslint-disable-next-line class-methods-use-this
  async hydateScubInfo(product) {
    const productIds = [
      product.id,
      ...product.children.map((child) => child.id),
      ...(product.parent ? [product.parent.id] : [])
    ];
    const scubsByProductId = await findScubs(productIds);

    addScubInfo(product, scubsByProductId);

    if (product.parent) {
      addScubInfo(product.parent, scubsByProductId);
    }

    product.children.forEach((child) => {
      addScubInfo(child, scubsByProductId);
    });
  }

  log(message, details) {
    this.logger.debug(LOGGER_PREFIX + message, {
      context: this.context,
      ...details
    });
  }
}

function addScubInfo(product, scubsByProductId) {
  if (product.id in scubsByProductId && scubsByProductId[product.id].length) {
    Object.assign(product, scubsByProductId[product.id][0]);
  }
}

module.exports = { ReadsqlProductRepository };
