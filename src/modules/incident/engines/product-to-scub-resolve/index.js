class ProductToScubResolveEngine {
  /**
   * @param {Object} param
   * @param {ProductScubMappingRepository} param.productScubMappingRepository
   * @param {ScubRepository} param.scubRepository
   */
  constructor({ productScubMappingRepository, scubRepository }) {
    this.productScubMappingRepository = productScubMappingRepository;
    this.scubRepository = scubRepository;
  }

  /**
   * @param {Object} param
   * @param {string[]} param.productIds
   * @param {string} param.ownerId
   * @returns {ProductIdToScubIdMap} productId <-> scubId
   */
  async resolve({ productIds, ownerId }) {
    const productIdToScubIdsMap = await this.findProductIdToScubIdsMap(productIds);

    return this.findProductIdToScubIdMap(productIdToScubIdsMap, ownerId);
  }

  /**
   * @private
   * @param {string[]} productIds
   * @returns {ProductIdToScubIdsMap}
   */
  async findProductIdToScubIdsMap(productIds) {
    const productScubMappings = await this.productScubMappingRepository.findManyByProductIds(
      productIds
    );

    return productScubMappings.reduce((map, { productId, scubId }) => {
      if (!map.has(productId)) {
        map.set([]);
      }

      const scubIds = map.get(productId);

      scubIds.push(scubId);

      map.set(scubIds);

      return map;
    }, new Map());
  }

  /**
   * @private
   * @param {ProductIdToScubIdsMap} productIdToScubIdsMap
   * @param {string} ownerId
   * @returns {ProductIdToScubIdMap}
   */
  async findProductIdToScubIdMap(productIdToScubIdsMap, ownerId) {
    const allScubIds = Array.from(productIdToScubIdsMap.entries()).reduce(
      (acc, [, innerScubIds]) => {
        acc.push(...innerScubIds);

        return acc;
      },
      []
    );
    const scubs = await this.scubRepository.findManyByIdsAndOwnerId(allScubIds, ownerId);

    return scubs.reduce((map, scub) => {
      const productIdToScubIdsEntry = Array.from(productIdToScubIdsMap.entries()).find(
        ([, scubIds]) => scubIds.includes(scub.id)
      );

      if (productIdToScubIdsEntry) {
        map.set(productIdToScubIdsEntry[0], scub.id);
      }

      return map;
    }, new Map());
  }
}

/**
 * @typedef {Map<string, string[]>} ProductIdToScubIdsMap
 */

/**
 * @typedef {Map<string, string>} ProductIdToScubIdMap
 */

module.exports = { ProductToScubResolveEngine };
