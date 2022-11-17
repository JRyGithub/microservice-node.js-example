const { expect } = require('chai');
const createCustomFields = require('./create-custom-fields');
const { TYPES } = require('../../modules/models/entity-type/constants');
const { formatISO8601ShortDate } = require('./format-functions');

const WIO = {
  id: '5873c649-77ba-468e-b305-9d628eea8ee7',
  pid: 948050,
  declaredPackingUnits: 1,
  receivedPackingUnits: 0,
  createdAt: '2020-06-30T10:17:54.000Z',
  updatedAt: '2020-06-30T10:17:54.000Z',
  receiptStartedAt: null,
  completedAt: null,
  status: 'VALIDATED',
  lines: [
    { barcode: 'ITEM_NOT_SCANNABLE', quantityLabelled: 1 },
    { barcode: 'test', quantityLabeled: 1 },
    { barcode: 'test2', quantityLabeled: 1 }
  ]
};

describe('[utils/zendesk/createCustomFields]', () => {
  describe('When creating order fields', () => {
    it('should work with nothing', async () => {
      const result = await createCustomFields(TYPES.ORDER, null);
      expect(result).to.deep.equal([]);
    });

    it('should include collect informations', async () => {
      const result = await createCustomFields(TYPES.ORDER, { data: { collectId: 1 } });
      expect(result).to.deep.equal([{ id: 26664229, value: 1 }]);
    });

    it('should include parcel informations', async () => {
      const data = {
        id: 1,
        lastName: 'jo',
        firstName: 'Ko'
      };
      const result = await createCustomFields(TYPES.ORDER, { data });
      expect(result).to.deep.equal([
        { id: 26615929, value: 'CUB1' },
        { id: 28541541, value: 'Ko jo' }
      ]);
    });

    it('should include all parcel informations', async () => {
      const data = {
        id: 1,
        lastName: 'jo',
        firstName: 'Ko',
        organizationName: 'Cubyn',
        carrierTrackingId: '123',
        carrier: 'colissimo',
        pickedAt: 'Tue Oct 04 2016 21:47:26 GMT+0200 (CEST)',
        orderRef: 'xxx'
      };
      const result = await createCustomFields(TYPES.ORDER, { data });
      expect(result).to.deep.equal([
        { id: 26615929, value: 'CUB1' },
        { id: 28355552, value: 'xxx' },
        { id: 360001996077, value: 'colissimo' },
        { id: 28291032, value: '123' },
        { id: 28541541, value: 'Ko jo (Cubyn)' },
        { id: 360008236577, value: '2016-10-04' }
      ]);
    });
  });

  describe('When creating invoice fields', () => {
    it('should include invoice links', async () => {
      const data = {
        realId: 1,
        pdf: { url: 'pdfLink' },
        csv: { url: 'csvLink' }
      };
      const result = await createCustomFields(TYPES.INVOICE, { data });
      expect(result).to.deep.equal([
        { id: 360008236917, value: 'pdfLink' },
        { id: 360008218838, value: 'csvLink' },
        { id: 360009319878, value: 1 }
      ]);
    });
  });

  describe('When creating sku fields', () => {
    it('should include sku informations', async () => {
      const data = {
        quantityPerStatus: {
          name: 'Test',
          sku: 'Test',
          isBundle: true,
          quantities: [
            { scubId: 1, STORED: 1, MISSING: 1 },
            { scubId: 2, STORED: 1 }
          ]
        }
      };
      const result = await createCustomFields(TYPES.SKU, { data });
      expect(result).to.deep.equal([
        { id: 360008236557, value: JSON.stringify(data.quantityPerStatus) }
      ]);
    });
  });

  describe('When creating WIO fields', () => {
    it('should include wio informations', async () => {
      const result = await createCustomFields(TYPES.WIO, { data: WIO });
      expect(result).to.deep.equal([
        { id: 360003634698, value: WIO.pid },
        { id: 360008236097, value: formatISO8601ShortDate(WIO.createdAt) },
        { id: 360008236117, value: formatISO8601ShortDate(WIO.updatedAt) },
        { id: 360008217358, value: WIO.status },
        { id: 360008236297, value: WIO.declaredPackingUnits },
        { id: 360008236317, value: WIO.receivedPackingUnits },
        { id: 360008236377, value: 1 },
        { id: 360008217398, value: 2 }
      ]);
    });
  });
});
