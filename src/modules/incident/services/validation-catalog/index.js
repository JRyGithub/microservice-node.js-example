const { assert, ServerError } = require('../../errors');
const { BuyingInvoiceValidationHelper } = require('./buying-invoice');

const HELPER_CLASSES = {
  BUYING_INVOICE: BuyingInvoiceValidationHelper
};

/**
 * The catalog of helpers to easily create document
 * validations from any specific incident.
 *
 * @interface ValidationCatalogService
 */
class ValidationCatalogService {
  constructor(deps) {
    this.deps = deps;
  }

  /**
   * @param {string} type
   * @returns {ValidationHelper}
   */
  findHelper(type) {
    assert(type in HELPER_CLASSES, ServerError, `Validation of type ${type} is not implemented`);

    return new HELPER_CLASSES[type](this.deps);
  }
}

module.exports = {
  ValidationCatalogService
};
