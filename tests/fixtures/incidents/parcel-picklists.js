const { v4 } = require('uuid');

const BASE_MOCK_PARCEL_PICKLIST = {
  // TODO: provide base mock parcel picklist
};

function buildMockParcelPicklist(overrides) {
  return {
    id: v4(),
    ...BASE_MOCK_PARCEL_PICKLIST,
    ...overrides
  };
}

module.exports = { buildMockParcelPicklist, BASE_MOCK_PARCEL_PICKLIST };
