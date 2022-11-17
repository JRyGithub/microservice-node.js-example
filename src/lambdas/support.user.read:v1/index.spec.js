// const sinon = require('sinon');
const { handler: lambda } = require('.');

describe('support.user.read:v1', () => {
  it('expose a handler', () => expect(lambda).to.not.be.undefined);
});
