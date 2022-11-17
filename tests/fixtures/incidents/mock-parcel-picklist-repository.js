const { buildMockParcelPicklist } = require('./parcel-picklists');

class MockParcelPicklistRepository {
  constructor(internalBuildMockParcelPicklist) {
    this.internalBuildMockParcelPicklist =
      internalBuildMockParcelPicklist || buildMockParcelPicklist;
  }

  async findOneByParcelId(parcelId) {
    return this.internalBuildMockParcelPicklist({ parcelId });
  }
}

module.exports = { MockParcelPicklistRepository };
