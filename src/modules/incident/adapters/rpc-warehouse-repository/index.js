class RpcWarehouseRepository {
  constructor(invoke) {
    this.invoke = invoke;
  }

  fetchByIdsWithAddress({ ids, includes }) {
    return this.invoke('warehouse.list:v1', {
      filters: {
        id: ids
      },
      includes
    });
  }
}

module.exports = { RpcWarehouseRepository };
