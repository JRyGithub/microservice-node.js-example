const sinon = require('sinon');
const { expect } = require('chai');
const { handler: lambda } = require('.');

describe('incident.export-consumer-refund:v1', () => {
  const EMPTY_INCIDENT = { attachments: [] };
  let invoke;
  let incidentRepository;

  beforeEach(() => {
    incidentRepository = {
      query: sinon.spy(async () => [EMPTY_INCIDENT]),
      count: sinon.spy(async () => 1)
    };
    invoke = sinon.spy(async () => []);
  });

  it('lambda is triggered correctly', async () => {
    const result = await lambda({ invoke }, { incidentRepository });
    expect(result).to.not.be.undefined;
  });
});
