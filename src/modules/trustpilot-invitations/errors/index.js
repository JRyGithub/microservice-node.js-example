/* eslint-disable max-classes-per-file */
const { assert, BadRequestError, ResourceNotFoundError } = require('@devcubyn/core.errors');
const trustpilotInvitationCreationErrors = require('./trustpilot-invitation-creation');

class UnknownTrustpilotInvitationEntityType extends BadRequestError {
  constructor(tpInvite) {
    super(`Unknown trustpilot invitation entity type: ${tpInvite.entityType}`);
    this.entityType = tpInvite.entityType;
  }
}

class SendInvitationError extends Error {
  constructor(innerError) {
    super('Send invitation error');
    this.innerError = innerError;
  }
}

class TokensHostNotFoundError extends ResourceNotFoundError {
  constructor() {
    super('Tokens host');
  }
}

class TokenNotFoundError extends ResourceNotFoundError {
  /**
   * @param {'ACCESS' | 'REFRESH'} tokenType
   */
  constructor(tokenType) {
    super(`${tokenType} token`);
  }
}

class TokenExpiredError extends Error {
  /**
   * @param {'ACCESS' | 'REFRESH'} tokenType
   */
  constructor(tokenType) {
    super('Token expired');
    this.tokenType = tokenType;
  }
}

module.exports = {
  assert,
  UnknownTrustpilotInvitationEntityType,
  SendInvitationError,
  TokensHostNotFoundError,
  TokenNotFoundError,
  TokenExpiredError,
  ...trustpilotInvitationCreationErrors
};
