/**
 * @interface UserRepository
 */
class RpcUserRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string} id
   * @returns {Promise<Shipper | void>}
   */
  async findOneById(id) {
    return this.invoke('user.read:v1', {
      filters: { id },
      includes: ['user.admin']
    });
  }
}

module.exports = { RpcUserRepository };
