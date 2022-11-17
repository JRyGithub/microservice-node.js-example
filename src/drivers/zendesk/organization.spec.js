const nock = require('nock');
const sinon = require('sinon');
const zendeskOrganization = require('./organization');
const env = require('../../env');

const zendeskDomain = env.ZENDESK_DOMAIN;
const zendeskUrl = `https://${zendeskDomain}.zendesk.com`;

describe('[utils/zendesk/organization]', () => {
  describe('[create]', () => {
    it('should create the organization', async () => {
      const user = { id: 277206218, organizationName: 'Tux' };

      const mock = zenMockCreateOrg(user);
      const organization = await zendeskOrganization.create({ user });
      expect(organization).to.be.an('object').to.have.properties({
        name: user.organizationName,
        external_id: user.id
      });
      expect(mock.isDone()).to.be.true;
    });

    it('should create the organization with firstName and lastName', async () => {
      const user = {
        id: 277206218,
        lastName: 'Lemaire',
        firstName: 'Mathieu'
      };
      const mock = zenMockCreateOrg(user);
      const organization = await zendeskOrganization.create({ user });
      expect(organization).to.be.an('object').to.have.properties({
        name: 'Lemaire Mathieu',
        external_id: user.id
      });
      expect(mock.isDone()).to.be.true;
    });
  });

  describe('[find]', () => {
    it('should find the organization with the matching external_id', async () => {
      const user = { id: 277206218 };
      const mock = zenMockFindOrg(user);

      const organization = await zendeskOrganization.find({ user });
      expect(organization).to.be.an('object').to.have.properties({ external_id: user.id });
      expect(mock.isDone()).to.be.true;
    });

    it('should return null if count is 0', async () => {
      const user = { id: 277206218 };
      // make the api respond empty organizations
      const mock = nock(zendeskUrl)
        .get(`/api/v2/organizations/search.json?external_id=${user.id}`)
        .reply(200, { count: 0, organizations: [] });

      const organization = await zendeskOrganization.find({ user });
      expect(organization).to.be.null;
      expect(mock.isDone()).to.be.true;
    });

    it('should return null for 201', async () => {
      const user = { id: 277206218 };
      // make the api respond a 404
      const mock = nock(zendeskUrl)
        .get(`/api/v2/organizations/search.json?external_id=${user.id}`)
        .reply(201, {});

      const organization = await zendeskOrganization.find({ user });
      expect(organization).to.be.null;
      expect(mock.isDone()).to.be.true;
    });
  });

  describe('[findOrCreate]', () => {
    beforeEach(() => {
      sinon.spy(zendeskOrganization, 'create');
    });

    afterEach(() => {
      // stop spying if create or find was spying
      zendeskOrganization.create.restore();
    });

    it('should not create if find', async () => {
      const user = { id: 277206218 };
      // make the zendesk api find the organization
      const mock = zenMockFindOrg(user);
      const organization = await zendeskOrganization.findOrCreate({ user });
      expect(organization).to.be.an('object').to.have.properties({ external_id: user.id });
      // make sure create was not called
      expect(zendeskOrganization.create.calledOnce).to.be.false;
      expect(mock.isDone()).to.be.true;
    });

    it('should create the org if not find', async () => {
      const user = { id: 277206218, organizationName: 'Tot' };
      // make the zendesk api not find the organization
      const mockFind = nock(zendeskUrl)
        .get(`/api/v2/organizations/search.json?external_id=${user.id}`)
        .reply(200, { count: 0, organizations: [] });
      // make the api create the user
      const mockCreate = zenMockCreateOrg(user);

      const organization = await zendeskOrganization.findOrCreate({ user });
      expect(organization)
        .to.be.an('object')
        .to.have.properties({ external_id: user.id, name: 'Tot' });
      // make sure create was not called
      expect(zendeskOrganization.create.calledOnce).to.be.true;
      expect(mockFind.isDone()).to.be.true;
      expect(mockCreate.isDone()).to.be.true;
    });
  });

  function zenMockCreateOrg(user) {
    const name = user.organizationName || `${user.lastName} ${user.firstName}`;

    return nock(zendeskUrl)
      .post('/api/v2/organizations.json')
      .reply(201, {
        organization: {
          id: 35437,
          name,
          external_id: user.id
        }
      });
  }

  function zenMockFindOrg(user) {
    return nock(zendeskUrl)
      .get(`/api/v2/organizations/search.json?external_id=${user.id}`)
      .reply(200, { count: 1, organizations: [{ external_id: user.id }] });
  }
});
