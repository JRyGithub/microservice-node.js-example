const { buildMockParcel } = require('./parcels');

class MockParcelRepository {
  constructor(internalBuildMockParcel) {
    this.internalBuildMockParcel = internalBuildMockParcel || buildMockParcel;
  }

  async findById(id) {
    return this.internalBuildMockParcel({ id });
  }

  async clone() {
    return this.internalBuildMockParcel();
  }
}

module.exports = { MockParcelRepository };
