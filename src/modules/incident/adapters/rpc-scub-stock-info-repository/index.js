/**
 * @interface ScubStockInfoRepository
 */

class RpcScubStockInfoRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[]} scubIds
   * @param {string | void} warehouseId
   * @returns {Promise<ScubStockInfo[]>}
   */
  async findByScubIdsAndWarehouseId(scubIds, warehouseId) {
    return this.invoke('storage-inventory__user-stock.list:v1', {
      filters: { scubId: scubIds, warehouseId }
    });
  }
}

module.exports = { RpcScubStockInfoRepository };
