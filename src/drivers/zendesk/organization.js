const { ForbiddenError } = require('@devcubyn/core.errors');
const { constants: httpConstants } = require('http2');
const createOrganizationFields = require('./create-organization-fields');

const { apiCall } = require('./api');

module.exports = {
  // Find an organization in zendesk for the given user else create the organization
  async findOrCreate({ user, context }) {
    const organization = await this.find({ user, context });

    if (!organization) {
      return this.create({ user, context });
    }

    return organization;
  },

  // Find an organization in zendesk with the given id
  async find({ user, context }) {
    const { id } = user;

    try {
      const { count, organizations } = await apiCall({
        uri: `/organizations/search.json?external_id=${id}`,
        context,
        type: 'find organization'
      });

      return count > 0 ? organizations[0] : null;
    } catch (error) {
      if (error.status === httpConstants.HTTP_STATUS_NOT_FOUND) {
        return null;
      }

      throw new Error(error.message);
    }
  },

  // Create an organization in zendesk
  async create({ user, context }) {
    const { id, organizationName, lastName, firstName } = user;
    const organization = {
      external_id: id,
      // this way we ensure every organization name is unique
      name: organizationName ? `${organizationName}-${id}` : `${lastName} ${firstName}-${id}`,
      // extra safety in ordder to avoid
      // automatic organization assignement based on mail domain
      domain_names: [''],
      organization_fields: await createOrganizationFields({ data: user })
    };

    try {
      const { organization: createdOrganization } = await apiCall({
        method: 'POST',
        uri: '/organizations.json',
        body: {
          organization
        },
        context,
        type: 'create organization'
      });

      return createdOrganization;
    } catch (error) {
      if (
        error.statusCode === httpConstants.HTTP_STATUS_UNPROCESSABLE_ENTITY &&
        error.error &&
        error.error.details &&
        error.error.details.name &&
        error.error.details.name.length > 0
      ) {
        const message =
          `Error: ${error.error.details.name[0].error}` +
          `, ${error.error.details.name[0].description}`;

        throw new ForbiddenError(message);
      }
      throw new Error(error.message);
    }
  }
};
