const createRefundTicket = require('.');

describe('fixtures/createRefundTicket', () => {
  it('should create a ticket (non regression test)', async () => {
    await expect(createRefundTicket).to.be.fulfilled;
  });
});
