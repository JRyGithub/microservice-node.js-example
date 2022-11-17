const { assert, MissingAttachmentError, InvalidStatusError } = require('../../errors');
const { BaseIncident } = require('./base');
const { PreprocessingResult, PreprocessingChecks } = require('./preprocessing-result');
const { AttachmentValidation } = require('../attachment-validation');
const { Concern } = require('../concern');

const REFUND_PER_GRAM = 0.033;
const DEFAULT_WEIGHT = 200;

/**
 * Product incident
 *
 * That incident simply triggers a BUYING_INVOICE document validation
 */
class ProductIncident extends BaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.isManualFlow = false;
    super(values, [], ['BUYING_INVOICE']);
  }

  async preprocess({
    itemRepository,
    sqlProductRepository,
    rpcProductRepository,
    incidentRepository
  }) {
    // When ITEM is provided as entity type, we still rely on incident that we are going to created
    // and as it is a PRODUCT incident, we go with the product flow.
    const { entityType } = this;
    this.entityType = BaseIncident.ENTITY_TYPES.PRODUCT;

    switch (entityType) {
      case BaseIncident.ENTITY_TYPES.PRODUCT: {
        const result = await this.preprocessProduct({
          itemRepository,
          productRepository: sqlProductRepository,
          incidentRepository
        });

        return result;
      }
      case BaseIncident.ENTITY_TYPES.ITEM: {
        const result = await this.preprocessItem({
          itemRepository,
          productRepository: rpcProductRepository,
          incidentRepository
        });

        return result;
      }
      default:
        return null;
    }
  }

  checkProduct({ product }) {
    const preprocessing = new PreprocessingResult();

    if (!product) {
      // product id was not found
      preprocessing.markCheckKO(PreprocessingChecks.FIND_PRODUCT, { id: this.entityId });

      return { preprocessing };
    }

    if (product.ownerId !== this.ownerId && !this.isRecipientSource()) {
      // product does not belong to incident's owner
      preprocessing.markCheckKO(PreprocessingChecks.FIND_PRODUCT, { id: this.entityId });

      return { preprocessing };
    }

    if (product.isUnknown || product.isVirtual || product.isBundle) {
      // product has wrong type
      preprocessing.markCheckKO(PreprocessingChecks.CHECK_PRODUCT_TYPE, product);

      return { preprocessing };
    }

    preprocessing.markCheckOK(PreprocessingChecks.CHECK_PRODUCT_TYPE, { id: this.entityId });

    return { preprocessing };
  }

  /**
   * Checks:
   * - product has correct type
   * - product has damaged items < 90days
   *
   * @param {Object} dependencies
   * @returns
   */
  async preprocessItem({ itemRepository, productRepository }) {
    const items = await itemRepository.findByIds(this.entityId);
    let product;
    let item;

    if (items.length !== 0) {
      [item] = items;
      const { scubId } = item;
      [product = {}] = (await productRepository.findProductsByScubId(scubId)) || [];
    }

    this.entityId = product.id;

    const { preprocessing } = this.checkProduct({ product });

    return { preprocessing, item, product };
  }

  /**
   * Checks:
   * - product has correct type
   * - product has damaged items < 90days
   *
   * @param {Object} dependencies
   * @returns
   */
  async preprocessProduct({ productRepository }) {
    const product = await productRepository.findById(this.entityId);

    const { preprocessing } = this.checkProduct({ product });

    return { preprocessing, product };
  }

  /**
   * Get BUYING_INVOICE attachment and request validation on it.
   *
   * @param {ValidationCatalogService} validationCatalog
   */
  async startAttachmentValidations({ validationCatalog, product }) {
    if (this.isManuallyUpdated) {
      return;
    }

    const validationInput = {
      ownerId: this.ownerId,
      productId: product.id
    };

    // one invoice supported only for the moment
    const [buyingInvoice] = this.getAttachments('BUYING_INVOICE');
    assert(buyingInvoice, MissingAttachmentError, 'BUYING_INVOICE');

    const validationHelper = validationCatalog.findHelper('BUYING_INVOICE');
    const validationId = await validationHelper.create([buyingInvoice], validationInput);

    this.attachmentValidations.push(
      new AttachmentValidation({
        validationId,
        incidentId: this.id,
        type: AttachmentValidation.TYPES.BUYING_INVOICE,
        status: 'CREATED'
      })
    );
  }

  /**
   * Compute and add the right amount for all concerns
   *
   * @param {Object} dependencies
   * @param {ProductRepository} dependencies.productRepository
   * @returns {Promise<void>}
   */
  async computeConcernRefunds({ productRepository }) {
    assert(this.status === 'RESOLVED', InvalidStatusError, this.status, ['RESOLVED']);

    const [buyingInvoiceValidation] = this.attachmentValidations;
    const { skuValue } = buyingInvoiceValidation.payload;

    const product = await productRepository.findById(this.entityId);
    const weight = product.weight || DEFAULT_WEIGHT;
    const refundValue = Math.min(weight * REFUND_PER_GRAM, skuValue);

    this.concerns.forEach((concern) => {
      // eslint-disable-next-line no-param-reassign
      concern.amount = refundValue;
      // eslint-disable-next-line no-param-reassign
      concern.amountType = Concern.AMOUNT_TYPES.VALUE;
    });
  }
}

module.exports = { ProductIncident };
