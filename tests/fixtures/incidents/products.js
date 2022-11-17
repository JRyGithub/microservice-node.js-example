const { v4 } = require('uuid');

const BASE_MOCK_PRODUCT = {
  // TODO: provide base mock product
};

function buildMockProduct(overrides) {
  return {
    id: v4(),
    ...BASE_MOCK_PRODUCT,
    ...overrides
  };
}

module.exports = { buildMockProduct, BASE_MOCK_PRODUCT };
