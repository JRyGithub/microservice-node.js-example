class EnvHost {
  /**
   * @param {Env} env
   */
  constructor(env = {}) {
    /**
     * @private
     * @type {Env}
     */
    this.env = env;
  }

  get() {
    return this.env;
  }
}

module.exports = { EnvHost };
