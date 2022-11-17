const dayjs = require('dayjs');
const { ProductIncident } = require('../../product-base');
const { Concern } = require('../../../concern');
const { PreprocessingChecks } = require('../../preprocessing-result');

const PRODUCT_LOST_IN_WAREHOUSE_MAX_AGE_DAYS = 90;

/**
 * "SKU lost in warehouse" incident
 *
 * That incident simply triggers a BUYING_INVOICE document validation
 */
class ProductLostInWarehouseIncident extends ProductIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = 'PRODUCT_LOST_IN_WAREHOUSE';
    super(values);
  }

  /**
   * Checks:
   * - product has correct type
   * - product has lost items < 90days
   *
   * @param {Object} dependencies
   * @returns {PreprocessingResult}
   */
  async preprocess({
    itemRepository,
    incidentRepository,
    sqlProductRepository,
    rpcProductRepository
  }) {
    const { preprocessing, product, item } = await super.preprocess({
      itemRepository,
      incidentRepository,
      sqlProductRepository,
      rpcProductRepository
    });

    if (preprocessing.hasErrors()) return { preprocessing, product };

    const lostItemIds = (await this.getItems({ itemRepository, product, item })) || [];

    // no lost item was reported
    preprocessing.assert(lostItemIds.length, PreprocessingChecks.FIND_MATCHING_CONCERNS);

    if (lostItemIds.length) {
      // we don't know the value yet
      const allConcerns = Concern.createItemMerchandise(this.id, lostItemIds, null);
      const existingConcerns = await incidentRepository.findConcernsById(
        allConcerns.map((concern) => concern.id)
      );
      const concerns = Concern.subtract(allConcerns, existingConcerns);

      // no lost item was reported
      preprocessing.assert(concerns.length, PreprocessingChecks.FILTER_EXISTING_CONCERNS);

      this.addConcerns(concerns);
    }

    return { preprocessing, product };
  }

  async getItems({ item, product, itemRepository }) {
    if (item) {
      if (item.status === 'LOST') return [item.id];

      return null;
    }

    return this.findLostItemIds(product, itemRepository);
  }

  /**
   * this minimum date should be constantly reevaluated
   * date of the incident creation should be taken into account
   * @returns {Date}
   */
  getMinLostDate() {
    return dayjs(this.createdAt).subtract(PRODUCT_LOST_IN_WAREHOUSE_MAX_AGE_DAYS, 'days').toDate();
  }

  /**
   * Find for given product all items currently declared as lost
   *
   * @param {Product} product
   * @param {ItemRepository} itemRepository
   * @returns {string[]} - item ids
   */
  async findLostItemIds(product, itemRepository) {
    return itemRepository.getItemsLostAfter(product.scubId, this.getMinLostDate());
  }
}

module.exports = { ProductLostInWarehouseIncident };
