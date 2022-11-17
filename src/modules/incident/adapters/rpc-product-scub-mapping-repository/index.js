/**
 * @interface ProductScubMapping
 */

class RpcProductScubMappingRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[]} productIds
   * @returns {Promise<ProductScubMappings[]>}
   */
  async findManyByProductIds(productIds) {
    return this.invoke('product-catalog__product-scub.list:v1', {
      filters: { productId: productIds }
    });
  }
}

module.exports = { RpcProductScubMappingRepository };
