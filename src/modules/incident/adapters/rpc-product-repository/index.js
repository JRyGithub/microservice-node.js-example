/**
 * @interface ProductRepository
 */

class RpcProductRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<Product>}
   */
  async findByIds(ids) {
    return this.invoke('product-catalog__product.list:v1', {
      filters: { id: ids.map((id) => id.toString()) }
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<ScubProductMapping>}
   */
  async findProductsByScubId(scubId) {
    const [{ productId }] = await this.invoke('product-catalog__product-scub.list:v1', {
      filters: { scubId }
    });

    return this.findByIds([productId]);
  }
}

module.exports = { RpcProductRepository };
