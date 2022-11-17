const { buildMockProduct } = require('./products');

class MockProductRepository {
  constructor(internalBuildMockProduct) {
    this.internalBuildMockProduct = internalBuildMockProduct || buildMockProduct;
  }

  async findByIds(ids) {
    return ids.map((id) => this.internalBuildMockProduct({ id }));
  }
}

module.exports = { MockProductRepository };
