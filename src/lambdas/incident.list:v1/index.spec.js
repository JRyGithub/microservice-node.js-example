const sinon = require('sinon');
const { expect } = require('chai');
const { handler: lambda } = require('.');

describe('lambdas/incident.list:v1', () => {
  const EMPTY_INCIDENT = { attachments: [] };
  const USER_ID = 10001;
  let data = {};
  let invoke;
  let incidentRepository;

  beforeEach(() => {
    incidentRepository = {
      query: sinon.spy(async () => [EMPTY_INCIDENT]),
      count: sinon.spy(async () => 1)
    };
    invoke = sinon.spy(async () => []);
  });

  it('when a SHIPPER, it should force a filter on ownerId', async () => {
    const context = {
      user: { id: USER_ID },
      permissions: { 'incident.read': [{ ownerId: USER_ID }] }
    };

    const result = await lambda({ context, data, invoke }, { incidentRepository });

    expect(result.items).to.deep.equal([EMPTY_INCIDENT]);
    expect(result.count).to.eql(1);
    expect(incidentRepository.query).to.have.been.calledOnce;
    expect(incidentRepository.query).to.have.been.calledWithMatch(
      { ownerId: USER_ID },
      { offset: 0 }
    );
    expect(incidentRepository.count).to.have.been.calledOnce;
    expect(incidentRepository.count).to.have.been.calledWithMatch({ ownerId: USER_ID });
  });

  it('when an unscoped AGENT, it should let list all incidents', async () => {
    const context = {
      user: { id: USER_ID }
    };

    const result = await lambda({ context, data, invoke }, { incidentRepository });

    expect(result.items).to.deep.equal([EMPTY_INCIDENT]);
    expect(incidentRepository.query).to.have.been.calledOnce;
    expect(incidentRepository.query).to.have.been.calledWithMatch({}, { offset: 0 });
    expect(incidentRepository.count).to.have.been.calledOnce;
  });

  it('should not forward unsupported filters', async () => {
    const context = {
      user: { id: USER_ID }
    };
    data = {
      filters: { hackyCommand: 'delete all' }
    };

    const result = await lambda({ context, data, invoke }, { incidentRepository });

    expect(result.items).to.deep.equal([EMPTY_INCIDENT]);
    expect(incidentRepository.query).to.have.been.calledOnce;

    const [[filters]] = incidentRepository.query.args;

    expect(filters).to.eql({});
  });

  it('should forward supported filters', async () => {
    const context = {
      user: { id: USER_ID }
    };
    data = {
      filters: {
        status: 'CREATED',
        refundStatus: 'STARTED',
        fromDate: '2021-08-19T00:00:00.000Z',
        toDate: '2021-08-19T23:59:59.000Z'
      },
      offset: 20
    };

    const result = await lambda({ context, data, invoke }, { incidentRepository });

    expect(result.items).to.deep.equal([EMPTY_INCIDENT]);
    expect(incidentRepository.query).to.have.been.calledOnce;
    expect(incidentRepository.query).to.have.been.calledWith(
      {
        status: 'CREATED',
        refundStatus: 'STARTED',
        fromDate: '2021-08-19T00:00:00.000Z',
        toDate: '2021-08-19T23:59:59.000Z'
      },
      {
        limit: 50,
        offset: 20
      }
    );
    expect(incidentRepository.count).to.have.been.calledWith({
      status: 'CREATED',
      refundStatus: 'STARTED',
      fromDate: '2021-08-19T00:00:00.000Z',
      toDate: '2021-08-19T23:59:59.000Z'
    });
  });

  describe('Support filter isManuallyUpdated', () => {
    let context;

    beforeEach(() => {
      context = {
        user: { id: USER_ID }
      };
      data = {
        filters: { status: 'CREATED', refundStatus: 'STARTED' }
      };
    });

    it('should add it', async () => {
      data.filters.isManuallyUpdated = 1;

      await lambda({ context, data, invoke }, { incidentRepository });

      expect(incidentRepository.query).to.have.been.calledWith(
        {
          status: 'CREATED',
          refundStatus: 'STARTED',
          isManuallyUpdated: 1
        },
        {
          limit: 50,
          offset: 0
        }
      );
      expect(incidentRepository.count).to.have.been.calledWith({
        status: 'CREATED',
        refundStatus: 'STARTED',
        isManuallyUpdated: 1
      });
    });

    it('should handle when false', async () => {
      data.filters.isManuallyUpdated = 0;

      await lambda({ context, data, invoke }, { incidentRepository });

      expect(incidentRepository.query).to.have.been.calledWith(
        {
          status: 'CREATED',
          refundStatus: 'STARTED',
          isManuallyUpdated: 0
        },
        {
          limit: 50,
          offset: 0
        }
      );
      expect(incidentRepository.count).to.have.been.calledWith({
        status: 'CREATED',
        refundStatus: 'STARTED',
        isManuallyUpdated: 0
      });
    });
  });

  it('should hydrate file urls', async () => {
    incidentRepository.query = () => [
      { attachments: [] },
      { attachments: [{ fileKey: 'ATT-1-0' }, { fileKey: 'ATT-1-1' }] },
      { attachments: [{ fileKey: 'ATT-2-0' }] },
      { attachments: null }
    ];

    invoke = sinon
      .stub()
      .withArgs('file.list:v1')
      .resolves([
        // wrong order
        { key: 'ATT-2-0', url: 'URL-2-0' },
        { key: 'ATT-1-1', url: 'URL-1-1' }
        // that one is not found by file.list
        // { key: 'ATT-1-0', url: 'URL-1-0' }
      ]);

    const { items } = await lambda({ context, data, invoke }, { incidentRepository });

    expect(invoke).to.have.been.calledWith('file.list:v1');

    const [, { filters }] = invoke.args.find(([lambdaName]) => lambdaName === 'file.list:v1');

    expect(filters).to.deep.eql({
      key: ['ATT-1-0', 'ATT-1-1', 'ATT-2-0']
    });

    expect(items[0].attachments).to.have.length(0);
    expect(items[1].attachments).to.includeArrayObjects([
      { fileKey: 'ATT-1-0', url: null },
      { fileKey: 'ATT-1-1', url: 'URL-1-1' }
    ]);
    expect(items[2].attachments).to.includeArrayObjects([{ fileKey: 'ATT-2-0', url: 'URL-2-0' }]);

    // that one stays null (not hydrated at all)
    expect(items[3].attachments).to.be.null;
  });
});
