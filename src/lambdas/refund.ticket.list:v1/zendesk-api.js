const request = require('request-promise-native');
const pThrottle = require('p-throttle');
const { assert } = require('@devcubyn/core.errors');
const env = require('../../env');

const {
  ZENDESK_DOMAIN,
  ZENDESK_EMAIL,
  ZENDESK_PASSWORD,
  // i.e. 250 requests per seconds max
  ZENDESK_API_THROTTLE_COUNT = '250',
  ZENDESK_API_THROTTLE_SECONDS = '60'
} = env;

assert(
  ZENDESK_DOMAIN,
  Error,
  'Service badly configured missing environment variable [ZENDESK_DOMAIN]'
);
assert(
  ZENDESK_EMAIL,
  Error,
  'Service badly configured missing environment variable [ZENDESK_EMAIL]'
);
assert(
  ZENDESK_PASSWORD,
  Error,
  'Service badly configured missing environment variable [ZENDESK_PASSWORD]'
);

const BASE_URL = `https://${ZENDESK_DOMAIN}.zendesk.com/api/v2`;
const BASE_TICKET_QUERY = 'type:ticket status>=solved tags:validated';

/**
 * Simple auth'ed API GET call to zendesk
 *
 * @param  {String} uri
 * @return {Promise}
 */
function apiGet(uri) {
  return request({
    uri: `${BASE_URL}/${uri}`,
    auth: {
      user: ZENDESK_EMAIL,
      pass: ZENDESK_PASSWORD
    },
    json: true
  });
}

/**
 * Throttled version of apiGet
 * @type {Function}
 */
const apiGetThrottled = pThrottle({
  limit: parseInt(ZENDESK_API_THROTTLE_COUNT, 10),
  interval: parseInt(ZENDESK_API_THROTTLE_SECONDS, 10)
})(apiGet);

/**
 * List all solved + refund tickets (tagged with "validated")
 * between those two dates
 *
 * @param  {String} options.dateField
 * @param  {Date} options.dateFrom
 * @param  {Date} options.dateTo
 * @param  {Integer} options.page
 * @return {Promise} raw response from API
 */
function listRefundTickets({ dateField, dateFrom, dateTo, page }) {
  let query = BASE_TICKET_QUERY;
  query += ` ${dateField}>=${dateFrom.toISOString()}`;
  query += ` ${dateField}<${dateTo.toISOString()}`;

  return apiGetThrottled(`search.json?query=${query}&page=${page}`);
}

/**
 * Get details of a Zendesk organization
 *
 * @param  {Number} organizationId
 * @return {Promise}
 */
function readOrganization(organizationId) {
  return apiGetThrottled(`organizations/${organizationId}.json`);
}

module.exports = { apiGetThrottled, listRefundTickets, readOrganization };
