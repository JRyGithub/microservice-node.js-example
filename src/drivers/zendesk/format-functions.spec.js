const { WIO_DELIVERIES, FORMATTED_WIO_DELIVERIES } = require('../../../tests/fixtures/wio');
const formatFunctions = require('./format-functions');

describe('[utils/zendesk/format-functions]', () => {
  const date = 'Tue Sep 08 2020 13:44:38 GMT+0300 (Eastern European Summer Time)';

  it('should formatPrettyDate', () => {
    expect(formatFunctions.formatPrettyDate(date)).to.equal('08/09/2020');
  });

  it('should formatISO8601ShortDate', () => {
    expect(formatFunctions.formatISO8601ShortDate(date)).to.equal('2020-09-08');
  });

  it('should formatOrderPID', () => {
    expect(formatFunctions.formatOrderPID(123456)).to.equal('CUB123456');
  });

  it('should revertFormatOrderPID', () => {
    expect(formatFunctions.revertFormatOrderPID('CUB123456')).to.equal(123456);
  });

  it('should stringify', () => {
    expect(formatFunctions.stringify({ a: 3 })).to.equal('{"a":3}');
  });

  it('should getOrderRecipientName', () => {
    const parcel1 = {
      lastName: 'lastName',
      firstName: 'firstName',
      organizationName: 'organizationName'
    };
    const parcel2 = {
      lastName: 'lastName',
      firstName: 'firstName'
    };
    const parcel3 = {
      organizationName: 'organizationName'
    };
    const parcel4 = {};

    expect(formatFunctions.getOrderRecipientName(parcel1)).to.equal(
      'firstName lastName (organizationName)'
    );
    expect(formatFunctions.getOrderRecipientName(parcel2)).to.equal('firstName lastName');
    expect(formatFunctions.getOrderRecipientName(parcel3)).to.equal('organizationName');
    expect(formatFunctions.getOrderRecipientName(parcel4)).to.equal(null);
  });

  it('should getParcelErrorType', () => {
    const validations1 = { address: { status: 'FAILED' } };
    const validations2 = { picklist: { error: 'STOCK_CHECK_FAILED' } };
    const validations3 = { picklist: { error: 'VALIDATION_FAILED' } };
    const validations4 = { picklist: { error: 'SOMETHING' } };

    expect(formatFunctions.getParcelErrorType(validations1)).to.equal('ADDRESS_ERROR');
    expect(formatFunctions.getParcelErrorType(validations2)).to.equal('OUT_OF_STOCK');
    expect(formatFunctions.getParcelErrorType(validations3)).to.equal('UNKNOWN_SKU');
    expect(formatFunctions.getParcelErrorType(validations4)).to.equal(null);
  });

  it('should getWioNotScannableCount', () => {
    const lines = [
      { barcode: 'ITEM_NOT_SCANNABLE' },
      { barcode: 'ITEM_NOT_SCANNABLE' },
      { barcode: 'ITEM_NOT_SCANNABLE' },
      { barcode: 'WHOOPS' }
    ];

    expect(formatFunctions.getWioNotScannableCount(lines)).to.equal(3);
  });

  it('should getWioLabelledCount', () => {
    const lines = [
      { barcode: 'WHOOPS', quantityLabeled: 3 },
      { barcode: 'WHOOPS2', quantityLabeled: 36 },
      { barcode: 'ITEM_NOT_SCANNABLE', quantityLabeled: 7 },
      { barcode: 'ITEM_NOT_SCANNABLE' }
    ];

    expect(formatFunctions.getWioLabelledCount(lines)).to.equal(39);
  });

  it('should formatAddress', () => {
    const object = {
      country: 'FR',
      firstName: 'Jean-Luc',
      lastName: 'Mélenchon',
      organizationName: 'Cubyn',
      email: 'jl.mel@cubyn.com',
      phone: '0797628391',
      line1: '69 rue de la Grande Bretagne',
      zip: '69000',
      city: 'Lyon'
    };

    expect(formatFunctions.formatAddress(object)).to.equal(
      'Jean-Luc Mélenchon, 69 rue de la Grande Bretagne, 69000 Lyon, FR'
    );
  });

  it('should isManuallyImported', () => {
    const via = {
      id: 321947324,
      name: '',
      token: '817330a7857f007acc6c19fd',
      ownerId: 105491996,
      status: 'DELETED',
      createdAt: '2020-02-26T09:09:15.000Z',
      updatedAt: '2020-02-26T09:09:15.000Z',
      classId: 9,
      settings: {
        shop: 'geoffroyStore',
        accessToken: '24242DFEFCEF424242',
        isAutoImportActivated: false,
        fulfillLocationId: 36723130450,
        isImporting: true
      }
    };

    expect(formatFunctions.isManuallyImported(via)).to.equal('NO');
  });

  describe('formatDeliveries', () => {
    it('should format deliveries when we have some', () => {
      expect(formatFunctions.formatDeliveries(WIO_DELIVERIES)).to.deep.equal(
        formatFunctions.stringify(FORMATTED_WIO_DELIVERIES)
      );
    });
    it('should return empty string when no deliveries are given', () => {
      expect(formatFunctions.formatDeliveries([])).to.equal('');
    });
  });
});
