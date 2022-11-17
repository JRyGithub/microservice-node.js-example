const getContentType = require('.');

describe('[utils/file]', () => {
  describe('getContentType', () => {
    const provider = [
      {
        vin: 'filename.pdf',
        vout: 'application/pdf'
      },
      {
        vin: 'toto/tata/filename.pdf',
        vout: 'application/pdf'
      },
      {
        vin: 'toto/tata/filename.PDF',
        vout: 'application/pdf'
      },
      {
        vin: 'toto',
        vout: null
      },
      {
        vin: 'toto.unknown',
        vout: null
      }
    ];

    provider.forEach(({ vin, vout }) => {
      it(`${vin} -› ${vout}`, () => {
        expect(getContentType(vin)).to.eql(vout);
      });
    });
  });
});
