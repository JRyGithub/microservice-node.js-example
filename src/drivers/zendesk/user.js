const { assert, ResourceNotFoundError } = require('@devcubyn/core.errors');
const { constants: httpConstants } = require('http2');
const logger = require('../logger');
const { apiCall } = require('./api');

module.exports = class ZendeskUserService {
  constructor({ context } = {}) {
    this.context = context;
  }

  // Find or create many zendesk users from emails
  findOrCreateFromEmails(emails = [], organization) {
    const promises = emails.map((email) => this.findOrCreate({ email }, organization));

    return Promise.all(promises);
  }

  /*
   * Find a zendesk user match the given user
   * Attach the user to given organization if needed
   */
  async findOrCreate(user, organization) {
    const zendeskUser = await this.find(user);

    if (!zendeskUser) {
      return this.create(user, organization);
    }

    // Patch an external id for existing user created via Help Center
    if (!zendeskUser.external_id) {
      await this.setExternalId(zendeskUser);
    }

    const belongsToOrganization = await this.belongsToOrganization(zendeskUser, organization.id);

    if (!belongsToOrganization) {
      /* attach user to organization
            /* will be set as default only if no default organization exists
            */
      await this.addOrganization(zendeskUser, organization.id);
    }

    return zendeskUser;
  }

  /*
   * Find the zendesk user corresponding to the given user.
   */
  async find({ email }) {
    if (!email) {
      return null;
    }

    try {
      logger.debug('Zendesk search user', {
        params: { email },
        context: this.context
      });
      const encodedEmail = encodeURIComponent(email.trim());
      const { users: [user] = [] } = await apiCall({
        uri: `/users/search.json?query=${encodedEmail}`,
        context: this.context,
        type: 'search user'
      });

      return user;
    } catch (error) {
      if (error.status === httpConstants.HTTP_STATUS_NOT_FOUND) {
        return null;
      }
      logger.error('Zendesk search user failed', {
        error,
        params: { email },
        context: this.context
      });
      throw new Error(error.message);
    }
  }

  /*
   * Create a user in zendesk with default organization
   */
  async create(user, organization) {
    const newUser = {
      external_id: user.email,
      organization_id: organization.id,
      email: user.email
    };

    if (user.lastName && user.firstName) {
      newUser.name = `${user.lastName} ${user.firstName}`;
    } else {
      newUser.name = user.lastName || user.firstName || user.email;
    }

    try {
      logger.debug('Zendesk create new user', {
        params: {
          user: newUser
        },
        context: this.context
      });
      const { user: zendeskUser } = await apiCall({
        method: 'POST',
        uri: '/users.json',
        body: { user: newUser },
        context: this.context,
        type: 'create new user'
      });

      return zendeskUser;
    } catch (error) {
      logger.error('Zendesk user creation failed', {
        error,
        params: {
          user: newUser
        },
        context: this.context
      });
      throw new Error(error.message);
    }
  }

  // Update external_id with email
  async setExternalId(zendeskUser) {
    try {
      logger.debug('Zendesk update externalId', {
        params: { user: zendeskUser },
        context: this.context
      });
      const result = await apiCall({
        method: 'PUT',
        uri: `/users/${zendeskUser.id}.json`,
        body: {
          user: {
            external_id: zendeskUser.email
          }
        },
        context: this.context,
        type: 'update externalId'
      });

      return result;
    } catch (error) {
      logger.error('Zendesk update externalId failed', {
        params: { user: zendeskUser },
        error,
        context: this.context
      });

      throw new Error(error.message);
    }
  }

  // Add an organization membership
  async addOrganization(zendeskUser, organizationId) {
    const organizationMembership = {
      organization_id: organizationId
    };

    try {
      logger.debug('Zendesk attach user to organization', {
        params: {
          user: zendeskUser,
          organizationId
        },
        context: this.context
      });
      await apiCall({
        method: 'POST',
        uri: `/users/${zendeskUser.id}/organization_memberships.json`,
        body: {
          organization_membership: organizationMembership
        },
        context: this.context,
        type: 'attach user to organization'
      });
    } catch (error) {
      logger.error('Zendesk attach user to organization failed', {
        error,
        params: {
          user: zendeskUser,
          organizationId
        },
        context: this.context
      });
    }
  }

  // Check if a user is part of an organization
  async belongsToOrganization(zendeskUser, organizationId) {
    const organizations = await this.listOrganizations(zendeskUser);

    const index = organizations.findIndex(
      (membership) => membership.organization_id === organizationId
    );

    return index !== -1;
  }

  // List user's organizations memberships
  async listOrganizations(zendeskUser) {
    try {
      logger.debug('Zendesk list user organizations', {
        params: { user: zendeskUser },
        context: this.context
      });
      const { organization_memberships: organizations } = await apiCall({
        uri: `/users/${zendeskUser.id}/organization_memberships.json`,
        context: this.context,
        type: 'list user organizations'
      });

      return organizations;
    } catch (error) {
      logger.error('Zendesk user oganizations failed', {
        error,
        params: {
          user: zendeskUser
        },
        context: this.context
      });
      throw new Error(error.message);
    }
  }

  /*
   * Set default organization
   */
  async setDefaultOrganization(zendeskUser, organizationId) {
    const organizations = await this.listOrganizations(zendeskUser);
    const { id } = organizations.find(
      (membership) => membership.organization_id === organizationId
    );

    assert(id, ResourceNotFoundError, 'User is not part of this organization', organizationId);

    try {
      logger.debug('Zendesk set user default organization', {
        params: {
          user: zendeskUser,
          organizationId,
          membershipId: id
        },
        context: this.context
      });
      const result = await apiCall({
        method: 'PUT',
        uri: `/users/${zendeskUser.id}/organization_memberships/${id}/make_default.json`,
        context: this.context,
        type: 'set user default organization'
      });

      return result;
    } catch (error) {
      logger.error('Zendesk set user default organization failed', {
        params: {
          user: zendeskUser,
          organizationId,
          membershipId: id
        },
        error,
        context: this.context
      });

      throw new Error(error.message);
    }
  }
};
