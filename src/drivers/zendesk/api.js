const { ApiError } = require('@devcubyn/core.errors');
const request = require('request-promise-native');
const { constants: httpConstants } = require('http2');
const logger = require('../logger');
const knownError = require('./ticket-update-errors');
const env = require('../../env');

const auth = {
  user: env.ZENDESK_EMAIL,
  pass: env.ZENDESK_PASSWORD
};

const zendeskApi = `https://${env.ZENDESK_DOMAIN}.zendesk.com/api/v2`;

async function apiCall({ method = 'GET', uri, body = null, type = null, context }) {
  let options = {
    method,
    uri: `${zendeskApi}${uri}`,
    auth,
    json: true,
    forever: true
  };

  if (method !== 'GET') {
    options = {
      ...options,
      body
    };
  }

  // eslint-disable-next-line no-unused-vars
  const { auth: _authRemoved, ...safeOptions } = options;

  logger.debug(`Zendesk ${type} api call`, {
    request: safeOptions,
    context
  });

  let response;

  try {
    response = await request(options);
  } catch (error) {
    logger.error(`Zendesk ${type} api failed`, {
      request: safeOptions,
      error,
      context
    });

    if (knownError(error)) {
      return false;
    }

    error.status =
      error.statusCode === httpConstants.HTTP_STATUS_UNAUTHORIZED
        ? httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR
        : error.statusCode;

    throw new ApiError(error.message, error.status);
  }

  logger.debug(`Zendesk ${type} api response`, {
    response,
    context
  });

  return response;
}
module.exports = { apiCall };
