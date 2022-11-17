const sinon = require('sinon');
const { expect } = require('chai');
const { handler: lambda } = require('.');
const { USER_TYPES } = require('../../modules/incident/domain/incident/base');

const buildContext = (ownerId) => {
  return {
    permissions: {
      'incident.read': [{ ownerId: [ownerId] }]
    },
    user: {
      id: ownerId,
      roles: Object.values(USER_TYPES)
    }
  };
};

describe('controllers/claims.list:v1', () => {
  let filters;
  let limit;
  let offset;
  let includes;
  let query;
  let data;
  let items;
  let count;
  let invoke;

  beforeEach(() => {
    filters = {};
    limit = 5;
    offset = 10;
    includes = [];
    query = { filters, limit, offset, includes };
    data = { query };
    items = [
      {
        requester: {
          bankInfo: {
            test: 'test'
          }
        }
      }
    ];
    count = 0;
    invoke = sinon.stub().resolves({ items, count });
  });

  afterEach(() => {
    invoke.reset();
  });

  it('should call lambda with provided query and return mapped result', async () => {
    const result = await lambda({ data, invoke, context: buildContext('123') });

    expect(invoke).to.be.calledWith('incident.list:v1');
    expect(result.body).to.have.length(1);
    expect(result.body[0]).to.have.own.property('requester');
    expect(result.body[0].requester).to.not.have.own.property('bankInfo');
    expect(result.headers['x-total-count']).to.equal(count);
    expect(result.headers['Access-Control-Expose-Headers']).to.equal('x-total-count');
  });
});
