/**
 * @interface ApplicationClass
 */
class RpcApplicationRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string} id
   * @returns {Promise<Application | void>}
   */
  async findById(id) {
    return this.invoke('application.list:v1', {
      filters: { id },
      includes: ['class']
    });
  }
}

module.exports = { RpcApplicationRepository };
