const { buildMockScubStockInfo } = require('./parcel-picklists');

class MockScubStockInfoRepository {
  constructor(internalBuildMockScubStockInfo) {
    this.internalBuildMockScubStockInfo = internalBuildMockScubStockInfo || buildMockScubStockInfo;
  }

  async findByScubIdsAndWarehouseId(scubIds, warehouseId) {
    return scubIds.map((scubId) => this.internalBuildMockScubStockInfo({ scubId, warehouseId }));
  }
}

module.exports = { MockScubStockInfoRepository };
