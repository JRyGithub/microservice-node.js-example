const { AttachmentValidation } = require('../../domain/attachment-validation');

/**
 * Dedicated helper to hydrate and request a doc validation
 *
 * @interface ValidationHelper
 */
class BuyingInvoiceValidationHelper {
  constructor({ productRepository, documentValidationRepository }) {
    this.type = AttachmentValidation.TYPES.BUYING_INVOICE;
    this.productRepository = productRepository;
    this.documentValidationRepository = documentValidationRepository;
  }

  async create(attachments, { productId }) {
    // preprocessing has already validated that this product exists
    const { sku, name } = await this.productRepository.findById(productId);

    const validationInput = {
      product: { sku, name }
    };

    return this.documentValidationRepository.validate(this.type, attachments, validationInput);
  }
}

module.exports = {
  BuyingInvoiceValidationHelper
};
