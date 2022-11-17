const { expect } = require('chai');
const { ConvenientCurrentDateHost } = require('.');
const { sleep } = require('../../../../../tests/sleep');

describe('adapters/convenient-current-date-host', () => {
  it('should always return the same date', async () => {
    const providedDate = new Date();
    const convenientCurrentDateHost = new ConvenientCurrentDateHost(providedDate);

    await sleep(10);
    expect(convenientCurrentDateHost.get().getTime()).to.equal(providedDate.getTime());
    await sleep(20);
    expect(convenientCurrentDateHost.get().getTime()).to.equal(providedDate.getTime());
    await sleep(30);
    expect(convenientCurrentDateHost.get().getTime()).to.equal(providedDate.getTime());
  });
});
