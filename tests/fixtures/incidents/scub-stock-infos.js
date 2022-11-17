const { v4 } = require('uuid');

const BASE_MOCK_SCUB_STOCK_INFO = {
  // TODO: provide base mock scub stock info
};

function buildMockScubStockInfo(overrides) {
  return {
    id: v4(),
    ...BASE_MOCK_SCUB_STOCK_INFO,
    ...overrides
  };
}

module.exports = { buildMockScubStockInfo, BASE_MOCK_SCUB_STOCK_INFO };
