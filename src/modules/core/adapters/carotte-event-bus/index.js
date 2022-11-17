// eslint-disable-next-line no-unused-vars
const { CarotteEvent } = require('../../events');

class CarotteEventBus {
  /**
   * @param {Object} param
   * @param {Function} param.publish
   */
  constructor({ publish }) {
    /**
     * @type {CarotteEvent[]}
     */
    this.events = [];
    this.publish = publish;
  }

  /**
   * @param {CarotteEvent} event
   */
  add(event) {
    this.events.push(event);
  }

  async publishAll() {
    await Promise.all(this.events.map(async ({ topic, payload }) => this.publish(topic, payload)));
  }
}

module.exports = { CarotteEventBus };
