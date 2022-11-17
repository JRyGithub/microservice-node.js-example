const { expect } = require('chai');
const sinon = require('sinon');
const logger = require('@devcubyn/core.logger');
const { formatMerchantName, truncateMerchantName } = require('.');

const sandbox = sinon.createSandbox();

describe('modules/notifications/domains/shipment-notification/utils/merchant-name', () => {
  beforeEach(() => {
    sandbox.spy(logger, 'warn');
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('formatMerchantName', formatMerchantNameSuite);
  describe('truncateMerchantName', truncateMerchantNameSuite);
});

function formatMerchantNameSuite() {
  describe('when classId is provided', () => {
    it('should return shipper organization name for online brands', onlineBrandsTest);
    it('should return class name for a marketplace app', marketPlaceAppTest);
    it('should log if dealing with unknown classId and fallback on app name', unknownClassId);
  });
  it('should log if merchant name is empty and fallback on app name', fallbackAppNameTest);

  function onlineBrandsTest() {
    [1, 2, 3, 4, 5].forEach(runTest);

    function runTest(classId) {
      const actual = launchTestedMethod(classId);
      expect(actual).to.equal('shipper org name');
    }
  }

  function marketPlaceAppTest() {
    [6, 7, 8, 9, 10, 11].forEach(runTest);

    function runTest(classId) {
      const actual = launchTestedMethod(classId);
      expect(actual).to.equal('market place name');
    }
  }

  function unknownClassId() {
    const actual = launchTestedMethod(12);
    expect(actual).to.equal('app-name');
    sinon.assert.calledTwice(logger.warn);
    sinon.assert.calledWithExactly(logger.warn, 'Unknown classId 12 for app 12351423');
    sinon.assert.calledWithExactly(
      logger.warn,
      'Empty merchant name for shipper 1293861 via app 12351423'
    );
  }

  function fallbackAppNameTest() {
    const actual = launchTestedMethod();
    expect(actual).to.equal('app-name');
    sinon.assert.calledOnce(logger.warn);
    sinon.assert.calledWithExactly(
      logger.warn,
      'Empty merchant name for shipper 1293861 via app 12351423'
    );
  }

  function launchTestedMethod(classId) {
    const params = {
      app: {
        id: 12351423,
        classId,
        class: {
          name: 'market place name'
        },
        name: 'app-name'
      },
      shipper: {
        id: 1293861,
        organizationName: 'shipper org name'
      }
    };

    return formatMerchantName(params);
  }
}

function truncateMerchantNameSuite() {
  it('should return given merchant name as is', shortMerchantNameTest);
  it('should return truncated merchant name', truncateMerchantNameTest);

  /**
   * [0-7] name length
   */
  function shortMerchantNameTest() {
    expect(truncateMerchantName('Amazon')).to.equal('Amazon');
    expect(truncateMerchantName('Rakuten')).to.equal('Rakuten');
    expect(truncateMerchantName('')).to.equal('');
    expect(truncateMerchantName('Aaa')).to.equal('Aaa');
  }

  /**
   * [8-*] name length
   */
  function truncateMerchantNameTest() {
    expect(truncateMerchantName('Facebook')).to.equal('Facebo…');
    expect(truncateMerchantName('BackMarket')).to.equal('BackMa…');
  }
}
