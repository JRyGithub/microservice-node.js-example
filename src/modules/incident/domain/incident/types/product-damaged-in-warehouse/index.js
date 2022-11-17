const dayjs = require('dayjs');
const { ProductIncident } = require('../../product-base');
const { PreprocessingChecks } = require('../../preprocessing-result');
const { Concern } = require('../../../concern');

const PRODUCT_DAMAGED_IN_WAREHOUSE_MAX_AGE_DAYS = 90;

/**
 * "SKU damaged in warehouse" incident
 *
 * That incident simply triggers a BUYING_INVOICE document validation
 */
class ProductDamagedInWarehouseIncident extends ProductIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = 'PRODUCT_DAMAGED_IN_WAREHOUSE';
    super(values);
  }

  async getItems({ item, product, itemRepository }) {
    if (item) {
      if (item.status === 'DAMAGED') {
        const itemIds = [item.id];

        const damages = (await itemRepository.damagedItems({ itemIds })).map(
          (damage) => damage.itemId
        );

        return damages;
      }

      return null;
    }

    return this.findDamagedItemIds(product, itemRepository);
  }

  /**
   * Checks:
   * - product has correct type
   * - product has damaged items < 90days
   *
   * @param {Object} dependencies
   * @returns
   */
  async preprocess({
    itemRepository,
    sqlProductRepository,
    rpcProductRepository,
    incidentRepository
  }) {
    const { product, item, preprocessing } = await super.preprocess({
      itemRepository,
      sqlProductRepository,
      rpcProductRepository,
      incidentRepository
    });

    if (preprocessing.hasErrors()) return { preprocessing, product };

    const damagedItemIds = await this.getItems({ product, item, itemRepository });

    // no damaged item was reported
    preprocessing.assert(damagedItemIds.length, PreprocessingChecks.FIND_MATCHING_CONCERNS);

    if (damagedItemIds.length) {
      // we don't know the value yet
      const allConcerns = Concern.createItemMerchandise(this.id, damagedItemIds, null);
      const existingConcerns = await incidentRepository.findConcernsById(
        allConcerns.map((concern) => concern.id)
      );
      const concerns = Concern.subtract(allConcerns, existingConcerns);

      // no damaged item was reported
      preprocessing.assert(concerns.length, PreprocessingChecks.FILTER_EXISTING_CONCERNS);

      this.addConcerns(concerns);
    }

    return { preprocessing, product };
  }

  /**
   * this minimum date should be constantly reevaluated
   * date of the incident creation should be taken into account
   * @returns {Date}
   */
  getMinDamageDate() {
    return dayjs(this.createdAt)
      .subtract(PRODUCT_DAMAGED_IN_WAREHOUSE_MAX_AGE_DAYS, 'days')
      .toDate();
  }

  /**
   * Find for given product all items currently declared as damaged
   *
   * @param {Product} product
   * @param {ItemRepository} itemRepository
   * @returns {string[]} - item ids
   */
  async findDamagedItemIds(product, itemRepository) {
    const damagedScubIds = [];

    if (product.children && product.children.length) {
      product.children.forEach((childProduct) => {
        // RESTRICTED is out of the scope for the moment
        if (childProduct.flag === 'DAMAGED') {
          damagedScubIds.push(childProduct.scubId);
        }
      });
    }

    if (!damagedScubIds.length) {
      return [];
    }

    return itemRepository.getItemsDamagedAfter(damagedScubIds, this.getMinDamageDate());
  }
}

module.exports = { ProductDamagedInWarehouseIncident };
