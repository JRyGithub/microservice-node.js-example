/**
 * @interface CurrentDateHost
 */
class ConvenientCurrentDateHost {
  constructor(date = new Date()) {
    /**
     * @private
     * @type {Date}
     */
    this.date = new Date(date);
  }

  /**
   * @returns {Date}
   */
  get() {
    return this.date;
  }
}

module.exports = { ConvenientCurrentDateHost };
