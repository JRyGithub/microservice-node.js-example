const schemaUtils = require('carotte-schema-utils');
const { assert, BadRequestError } = require('@devcubyn/core.errors');
const ZendeskUserService = require('../../drivers/zendesk/user');
const zendeskOrganization = require('../../drivers/zendesk/organization');

async function handler({ data, context }) {
  assert(data.payload, BadRequestError, 'Missing payload');
  assert(data.payload.user, BadRequestError, 'Missing user in payload');

  const { user } = data.payload;
  const zendeskUserService = new ZendeskUserService({ context });

  // We don't just create an organization
  // because it can be a creation linked to an email update
  const organization = await zendeskOrganization.findOrCreate({ user, context });
  const zendeskUser = await zendeskUserService.findOrCreate(user, organization);

  // if user existed already and was used as requester/cc email
  // it will have an existing default organization
  if (zendeskUser.organization_id !== organization.id) {
    await zendeskUserService.setDefaultOrganization(zendeskUser, organization.id);
  }

  return { success: true };
}

const meta = {
  retry: {
    max: 0
  },
  description: 'Create (or find) Zendesks organization/user for a given Cubyn user',
  requestSchema: schemaUtils.object('Request', {
    required: ['payload'],
    properties: {
      payload: schemaUtils.object('Payload', {
        required: ['user'],
        properties: {
          user: schemaUtils.object('Cubyn user', {
            required: ['id', 'email'],
            properties: {
              id: schemaUtils.integer('User id'),
              email: schemaUtils.string('User email', { format: 'email' })
            }
          })
        }
      })
    }
  })
};

module.exports = { handler, meta };
