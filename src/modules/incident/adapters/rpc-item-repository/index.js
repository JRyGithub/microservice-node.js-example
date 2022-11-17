/**
 * @interface ItemRepository
 */
class RpcItemRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[] | string}
   * @returns {Promise<Object[]>}
   */
  async findByIds(id) {
    const filters = { id };
    const items = await this.invoke('item.list:v1', { filters });

    if (!items || !items.length) {
      return [];
    }

    return items;
  }

  async damagedItems({ itemIds }) {
    return this.invoke('storage-quality__item-damage.list:v1', {
      filters: { itemId: itemIds }
    });
  }

  /**
   * @param {string[]} scubIds
   * @param {Date} minDate
   * @returns {Promise<Object>}
   */
  async getItemsDamagedAfter(scubIds, minDate) {
    const filters = { scubId: scubIds };
    const items = await this.invoke('item.list:v1', { filters });

    if (!items || !items.length) {
      return [];
    }

    const itemIds = items.map(({ id }) => id);

    const damages = await this.damagedItems({ itemIds });

    const filteredIds = damages
      .filter((damage) => new Date(damage.createdAt) >= minDate)
      .map((damage) => damage.itemId);

    return Array.from(new Set(filteredIds));
  }

  /**
   * Get ids of items lost from scubs. Which haven't been updated after specific date
   * @param {string} scubId
   * @param {Date} minDate
   * @return {string[]} itemIds
   */
  async getItemsLostAfter(scubId, minDate) {
    const filters = {
      scubId,
      status: 'LOST'
    };

    const items = await this.invoke('item.list:v1', { filters });

    return items.filter(({ updatedAt }) => new Date(updatedAt) > minDate).map((item) => item.id);
  }
}

module.exports = { RpcItemRepository };
