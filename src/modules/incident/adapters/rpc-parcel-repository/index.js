const { buildCreateParcelDTOFromParcel } = require('./utils/build-create-parcel-dto-from-parcel');

/**
 * @interface ParcelRepository
 */
class RpcParcelRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string} id
   * @returns {Promise<Parcel>}
   */
  async findById({
    id,
    includes = [
      'parcel.picklist',
      'parcel.validations',
      'parcel.admin',
      'parcel.isTrustedDestination',
      'parcel.pii',
      'parcel.details'
    ]
  }) {
    return this.invoke('parcel.read:v1', {
      filters: { id: id.toString() },
      includes
    });
  }

  /**
   * @param {Array<string>} ids
   * @returns {Promise<Parcel>}
   */
  async findByIds({
    ids,
    includes = ['parcel.picklist', 'parcel.validations', 'parcel.admin', 'parcel.pii']
  }) {
    return this.invoke('parcel.list:v1', {
      filters: { id: ids },
      includes
    });
  }

  async clone(parcel) {
    const createParcelDTO = buildCreateParcelDTOFromParcel(parcel);

    const [createdParcel] = await this.invoke('parcel.create:v1', { payload: createParcelDTO });

    return createdParcel;
  }
}

module.exports = { RpcParcelRepository };
