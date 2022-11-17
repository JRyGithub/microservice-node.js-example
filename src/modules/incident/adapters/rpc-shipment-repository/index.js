/**
 * @interface ShipmentRepository
 */
class RpcShipmentRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  async findOneByParcelId(parcelId) {
    return this.invoke('shipment.read:v1', { filters: { id: parcelId } });
  }

  /**
   * @param {Array<string>} ids
   */
  async findByIds({ ids }) {
    return this.invoke('shipment.list:v1', {
      filters: { ids }
    });
  }
}

module.exports = { RpcShipmentRepository };
