/**
 * @interface ScubRepository
 */

class RpcScubRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[]} scubIds
   * @param {string | void} ownerId
   * @returns {Promise<Scub[]>}
   */
  async findManyByIdsAndOwnerId(scubIds, ownerId) {
    return this.invoke('scub__scub.list:v1', {
      filters: { id: scubIds, ownerId }
    });
  }
}

module.exports = { RpcScubRepository };
