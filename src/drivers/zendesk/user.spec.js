const { expect } = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const ZendeskUserService = require('./user');
const env = require('../../env');

const zendeskUser = ZendeskUserService.prototype;

const zendeskDomain = env.ZENDESK_DOMAIN;
const zendeskUrl = `https://${zendeskDomain}.zendesk.com`;

describe('[utils/zendesk/user]', () => {
  describe('[create]', () => {
    it('should create the user', async () => {
      let user = { email: 'Tux', firstName: 'A', lastName: 'B' };
      const organization = { id: 24356564324 };

      const mock = zenMockCreateUser(user, organization);
      user = await zendeskUser.create(user, organization);
      expect(user).to.be.an('object').to.have.properties({
        name: 'B A',
        organization_id: organization.id,
        external_id: 'Tux'
      });
      expect(mock.isDone()).to.be.true;
    });

    it('should create the user with email as name', async () => {
      let user = { email: 'TAX' };
      const organization = { id: 24356564324 };
      const mock = zenMockCreateUser(user, organization);
      user = await zendeskUser.create(user, organization);
      expect(user).to.be.an('object').to.have.properties({
        name: 'TAX',
        organization_id: organization.id,
        external_id: 'TAX'
      });
      expect(mock.isDone()).to.be.true;
    });
  });

  describe('[find]', () => {
    it('should return null if the user has no email', async () => {
      const res = await zendeskUser.find({});
      expect(res).to.be.null;
    });
    it('should find the user with the matching email', async () => {
      let user = { email: 'toto@gmail.lu' };
      const mock = zenMockFindUser(user);

      user = await zendeskUser.find(user);
      expect(user).to.be.an('object').to.have.properties({ external_id: 'toto@gmail.lu' });
      expect(mock.isDone()).to.be.true;
    });

    it('should return null if count is 0', async () => {
      let user = { email: 'toto@gmail.lu' };
      // make the api respond empty users
      const mock = nock(zendeskUrl)
        .get(`/api/v2/users/search.json?query=${encodeURIComponent(user.email)}`)
        .reply(200, { count: 0, users: [] });

      user = await zendeskUser.find(user);
      expect(user).to.be.undefined;
      expect(mock.isDone()).to.be.true;
    });

    it('should return null for bad email', async () => {
      let user = { email: 'toto@gmail.lu' };
      // make the api respond a 201
      nock(zendeskUrl)
        .get(`/api/v2/users/search.json?query=${encodeURIComponent(user.email)}`)
        .reply(201, {});

      user = zendeskUser.find(user);
      expect(user).to.be.empty;
    });
  });

  describe('[findOrCreate]', () => {
    afterEach(() => {
      // stop spying if create or find was spying
      if (zendeskUser.create.restore) {
        zendeskUser.create.restore();
      }
      if (zendeskUser.find.restore) {
        zendeskUser.find.restore();
      }
    });

    it('should not create if find', async () => {
      let user = { id: 1, email: 'toto@gmail.lu' };
      const organization = { id: 1 };

      sinon.spy(zendeskUser, 'create');
      // make the zendesk api find the user
      const mock2 = zenMockListOrganization(user);
      const mock = zenMockFindUser(user);
      user = await zendeskUser.findOrCreate(user, organization);
      expect(user).to.be.an('object').to.have.properties({ external_id: 'toto@gmail.lu' });
      // make sure create was not called
      expect(zendeskUser.create.calledOnce).to.be.false;
      expect(mock.isDone()).to.be.true;
      expect(mock2.isDone()).to.be.true;
    });
  });

  describe('[findOrCreateFromEmails]', () => {
    before(() => {
      sinon.spy(zendeskUser, 'findOrCreate');
    });
    after(() => {
      zendeskUser.findOrCreate.restore();
    });

    it('should call find for given emails', async () => {
      const emails = ['toto@yahoo.com', 'hikaru@nogo.jp'];
      const organization = { id: 1 };
      const mockListOrg = zenMockListOrganization({ id: 1 });
      const mockListOrg2 = zenMockListOrganization({ id: 1 });
      const mockFind1 = zenMockFindUser({ email: 'toto@yahoo.com' });
      const mockFind2 = zenMockFindUser({ email: 'hikaru@nogo.jp' });
      const users = await zendeskUser.findOrCreateFromEmails(emails, organization);
      expect(mockListOrg.isDone()).to.be.true;
      expect(mockListOrg2.isDone()).to.be.true;
      expect(mockFind1.isDone()).to.be.true;
      expect(mockFind2.isDone()).to.be.true;
      expect(users).to.deep.equal([
        {
          external_id: 'toto@yahoo.com',
          email: 'toto@yahoo.com',
          id: 1,
          organization_id: 1
        },
        {
          external_id: 'hikaru@nogo.jp',
          email: 'hikaru@nogo.jp',
          id: 1,
          organization_id: 1
        }
      ]);
      expect(zendeskUser.findOrCreate.calledTwice).to.be.true;
    });

    it('should return an empty array', async () => {
      const result = await zendeskUser.findOrCreateFromEmails(undefined, { id: '341' });
      expect(result).to.deep.equal([]);
    });
  });

  function zenMockCreateUser(user, organization) {
    const name =
      user.lastName && user.firstName
        ? `${user.lastName} ${user.firstName}`
        : user.lastName || user.firstName || user.email;

    return nock(zendeskUrl)
      .post('/api/v2/users.json')
      .reply(201, {
        user: {
          id: 35437,
          name,
          external_id: user.email,
          organization_id: organization.id
        }
      });
  }

  function zenMockListOrganization(user) {
    return nock(zendeskUrl)
      .get(`/api/v2/users/${user.id}/organization_memberships.json`)
      .reply(200, {
        count: 1,
        organization_memberships: [
          {
            id: 1,
            organization_id: 1,
            default: true
          }
        ]
      });
  }

  function zenMockFindUser(user) {
    const externalId = encodeURIComponent(user.email);

    return nock(zendeskUrl)
      .get(`/api/v2/users/search.json?query=${externalId}`)
      .reply(200, {
        count: 1,
        users: [
          {
            id: 1,
            email: user.email,
            external_id: user.email,
            organization_id: 1
          }
        ]
      });
  }
});
