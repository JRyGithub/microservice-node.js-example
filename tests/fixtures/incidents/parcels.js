const BASE_MOCK_PARCEL = {
  // TODO: provide base mock parcel
};

function buildMockParcel(overrides) {
  return {
    id: Math.floor(Math.random() * 1000000000),
    ...BASE_MOCK_PARCEL,
    ...overrides
  };
}

module.exports = { buildMockParcel, BASE_MOCK_PARCEL };
