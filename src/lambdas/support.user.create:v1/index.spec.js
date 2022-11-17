const sinon = require('sinon');
const ZendeskUserService = require('../../drivers/zendesk/user');
const zendeskOrganization = require('../../drivers/zendesk/organization');
const { handler: lambda } = require('.');

const zendeskUser = ZendeskUserService.prototype;

const USER_FIXTURE = {
  email: 'cube@cubyn.com',
  lastName: 'cube',
  firstName: 'cubyn'
};
const ZENDESK_ORGANIZATION_1 = {
  id: 1
};
const ZENDESK_ORGANIZATION_2 = {
  id: 2
};
const ZENDESK_USER_1 = {
  organization_id: ZENDESK_ORGANIZATION_1.id
};
const ZENDESK_USER_2 = {
  organization_id: ZENDESK_ORGANIZATION_2.id
};

describe('lambdas/support.user.create:v1', () => {
  beforeEach(() => {});

  afterEach(() => {
    zendeskUser.findOrCreate.restore();
    zendeskOrganization.findOrCreate.restore();
  });

  it('should create organization and user', async () => {
    sinon.stub(zendeskUser, 'findOrCreate').callsFake(() => ZENDESK_USER_1);
    sinon.stub(zendeskOrganization, 'findOrCreate').callsFake(() => ZENDESK_ORGANIZATION_1);

    const result = await lambda({
      data: {
        payload: { user: USER_FIXTURE }
      }
    });

    expect(zendeskOrganization.findOrCreate.calledOnce).to.be.true;
    expect(zendeskOrganization.findOrCreate.args[0][0].user).to.deep.equal(USER_FIXTURE);
    expect(zendeskUser.findOrCreate.calledOnce).to.be.true;
    expect(zendeskUser.findOrCreate.args[0]).to.deep.equal([USER_FIXTURE, ZENDESK_ORGANIZATION_1]);
    expect(result).to.be.eql({ success: true });
  });

  it('should create organization and user and set new org as default', async () => {
    sinon.stub(zendeskUser, 'findOrCreate').callsFake(() => ZENDESK_USER_2);
    sinon.stub(zendeskOrganization, 'findOrCreate').callsFake(() => ZENDESK_ORGANIZATION_1);
    sinon.stub(zendeskUser, 'setDefaultOrganization');
    const result = await lambda({
      data: {
        payload: { user: USER_FIXTURE }
      }
    });

    expect(zendeskUser.setDefaultOrganization.calledOnce).to.be.true;
    expect(zendeskOrganization.findOrCreate.calledOnce).to.be.true;
    expect(zendeskOrganization.findOrCreate.args[0][0].user).to.deep.equal(USER_FIXTURE);
    expect(zendeskUser.findOrCreate.calledOnce).to.be.true;
    expect(zendeskUser.findOrCreate.args[0]).to.deep.equal([USER_FIXTURE, ZENDESK_ORGANIZATION_1]);
    expect(result).to.be.eql({ success: true });
  });
});
