const { buildCreateParcelDTOFromParcel } = require('./build-create-parcel-dto-from-parcel');

describe('build-create-parcel-dto-from-parcel', () => {
  it('should copy a parcel with viaApplicationId', () => {
    const parcel = {
      firstName: 'firstname',
      viaApplicationId: 'appId',
      unknownField: 'unkown'
    };

    const result = buildCreateParcelDTOFromParcel(parcel);
    expect(result.viaApplicationId).to.be.eql(parcel.viaApplicationId);
    expect(result.unknownField).to.be.undefined;
  });
});
