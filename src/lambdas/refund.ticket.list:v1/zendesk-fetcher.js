/* eslint-disable max-classes-per-file */
const lodash = require('lodash');

const api = require('./zendesk-api');
const logger = require('../../drivers/logger');
const ZendeskTicket = require('../../modules/zendesk-ticket');
const env = require('../../env');

const {
  // 1 day pagination
  ZENDESK_API_CHUNK_DATE_SECONDS = '86400'
} = env;

// eslint-disable-next-line no-magic-numbers
const CHUNK_MSECONDS = 1000 * parseInt(ZENDESK_API_CHUNK_DATE_SECONDS, 10);

/**
 * Error details about a ticket formatting issue
 */
class ZendeskTicketError {
  constructor(ticket, message) {
    this.ticketId = ticket.id;
    this.message = message;
  }
}

/**
 * Utility class to fetch all refund tickets,
 * hydrated with their organization and
 * respecting Zendesk API Rate Limits (700/mn):
 *     - split by day
 *     - split by page of 100 (ZD default limit)
 */
class ZendeskFetcher {
  /**
   * @param  {Object} context carotte's execution context
   * @param  {String} query.dateField
   * @param  {Date} query.dateFrom
   * @param  {Date} query.dateTo
   */
  constructor(context, { dateField, dateFrom, dateTo }) {
    this.context = context;
    this.dateField = dateField;
    this.dateRanges = computeDateRanges(dateFrom, dateTo);

    // cache of all organization.get API promises
    this.organizationMap = {};

    // all successful tickets
    this.tickets = [];

    // all errors by ticket
    this.errors = [];
  }

  /**
   * @return {Array<ZendeskTicket>}
   */
  getTickets() {
    return this.tickets;
  }

  /**
   * @return {Array<ZendeskTicketError>}
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Split date range into individual by single date fetch
   * and store all tickets
   *
   * @return {Promise}
   */
  async fetch() {
    const fetchDayPromises = this.dateRanges.map(async (range) => {
      let hasNext = true;
      let page = 1;

      while (hasNext) {
        const result = await this.fetchPage({ ...range, page });
        hasNext = result.hasNext;
        page++;
      }
    });

    // launch all dates at once:
    // api will be throttled automatically
    return Promise.all(fetchDayPromises);
  }

  /**
   * Fetch a single page from a date range
   *
   * @param  {Date} options.dateFrom
   * @param  {Date} options.dateTo
   * @param  {Number} options.page
   * @return {Promise}
   */
  async fetchPage({ dateFrom, dateTo, page = 1 }) {
    const query = {
      dateField: this.dateField,
      dateFrom,
      dateTo,
      page
    };

    logger.debug(`[start] fetch refund tickets ${query.dateFrom} (page = ${query.page})`, {
      query,
      context: this.context
    });

    const response = await api.listRefundTickets(query);
    const hasNext = !!response.next_page;
    const rawTickets = response.results;
    let successCount = 0;
    let errorCount = 0;

    await Promise.all(
      rawTickets.map(async (rawTicket) => {
        try {
          const ticket = await this.processRawTicket(rawTicket);
          successCount++;
          this.tickets.push(ticket);
        } catch (error) {
          errorCount++;
          this.errors.push(error);
        }
      })
    );

    const logMethod = errorCount ? 'warn' : 'debug';
    logger[logMethod](`[end] fetch refund tickets ${query.dateFrom} (page = ${query.page})`, {
      query,
      context: this.context,
      successCount,
      errorCount
    });

    return { hasNext, successCount, errorCount };
  }

  /**
   * Read organization's user PID
   * from Zendesk API or current cache
   *
   * @param  {Number} organizationId
   * @return {Promise<Object>}
   * @throws {Error} If any api/formatting error
   */
  async readOrganizationUserId(organizationId) {
    if (!organizationId) {
      throw new Error('ticket has no organizationId');
    }

    if (!this.organizationMap[organizationId]) {
      // Organization cache: do not fetch this org multiple times
      const readOrg = async () => {
        const { organization } = await api.readOrganization(organizationId);

        const userPid =
          lodash.get(organization, 'organization_fields.userpid') ||
          lodash.get(organization, 'external_id');

        if (!userPid) {
          throw new Error("ticket's organization has no Cubyn ID");
        }

        return userPid;
      };

      this.organizationMap[organizationId] = readOrg();
    }

    return this.organizationMap[organizationId];
  }

  /**
   * Process raw API Ticket: hydrate organization
   *
   * @param  {Object} rawTicket
   * @return {Promise<ZendeskTicket>}
   */
  async processRawTicket(rawTicket) {
    const ticket = ZendeskTicket.fromJson(rawTicket);

    try {
      const userPid = await this.readOrganizationUserId(ticket.organizationId);
      lodash.set(ticket, 'organizationFields.userPid', userPid);

      return ticket;
    } catch (error) {
      throw new ZendeskTicketError(ticket, error.message);
    }
  }
}

/**
 * Split given date range by day [{ from, to }]
 *
 * @param  {Date} dateFrom
 * @param  {Date} dateTo
 * @return {Array({dateFrom, dateTo})}
 */
function computeDateRanges(dateFrom, dateTo) {
  const dateRanges = [];
  let currentDateFrom = dateFrom;
  let currentDateTo = new Date(currentDateFrom.getTime() + CHUNK_MSECONDS);

  while (currentDateFrom < dateTo) {
    dateRanges.push({
      dateFrom: currentDateFrom,
      dateTo: currentDateTo
    });
    currentDateFrom = currentDateTo;
    currentDateTo = new Date(currentDateFrom.getTime() + CHUNK_MSECONDS);
  }

  return dateRanges;
}

module.exports = ZendeskFetcher;
