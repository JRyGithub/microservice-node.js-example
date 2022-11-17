const sinon = require('sinon');
const { expect } = require('chai');
const { handler: lambda } = require('.');

describe('incident.update-consumer-refund-status:v1', () => {
  const EMPTY_INCIDENT = { attachments: [] };
  let invoke;
  let filters;
  let incidentRepository;

  beforeEach(() => {
    incidentRepository = {
      query: sinon.spy(async () => [EMPTY_INCIDENT]),
      count: sinon.spy(async () => 1)
    };
    invoke = sinon.spy(async () => []);
    filters = {};
  });

  it('lambda is triggered correctly', async () => {
    const result = await lambda({ invoke, data: { filters } }, { incidentRepository });
    expect(result).to.not.be.undefined;
  });
});
