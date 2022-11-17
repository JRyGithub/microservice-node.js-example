const { expect } = require('chai');
const createOrganizationFields = require('./create-organization-fields');

const USER = {
  id: 5,
  enabled: 1,
  sales: 'test',
  preSales: 'test'
};

describe('utils/zendesk/create-organization-fields', () => {
  it('should return fields based on user input', async () => {
    const organizationFields = await createOrganizationFields({ data: USER });
    expect(organizationFields).to.eql({
      userpid: 5,
      enabled: 1,
      sales: 'test',
      presales_category: 'test'
    });
  });
});
