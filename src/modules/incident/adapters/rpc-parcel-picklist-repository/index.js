/**
 * @interface ParcelPicklistRepository
 */

class RpcParcelPicklistRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string} parcelId
   * @returns {Promise<ParcelPicklist | void>}
   */
  async findOneByParcelId(parcelId) {
    const parcelPicklists = await this.invoke('parcel-picklist.list:v1', {
      filters: {
        parcelId: parcelId.toString()
      },
      includes: ['lines', 'scubs']
    });

    if (!parcelPicklists || !parcelPicklists[0]) {
      return;
    }

    // eslint-disable-next-line consistent-return
    return parcelPicklists[0];
  }
}

module.exports = { RpcParcelPicklistRepository };
