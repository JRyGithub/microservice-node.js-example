const logger = require('../../drivers/logger');
const ZendeskFetcher = require('./zendesk-fetcher');

const API_DATE_FIELDS = ['solved', 'created', 'updated', 'due_date'];
// eslint-disable-next-line no-magic-numbers
const DAY_MS = 24 * 60 * 60 * 1000;

async function handler({ data, context }) {
  const { dateField = API_DATE_FIELDS[0] } = data;
  const dateFrom = new Date(data.dateFrom || new Date(new Date() - DAY_MS));
  const dateTo = new Date(data.dateTo || new Date(new Date() - DAY_MS));

  const query = {
    dateField,
    dateFrom,
    dateTo
  };
  const fetcher = new ZendeskFetcher(context, query);
  await fetcher.fetch();

  const tickets = fetcher.getTickets();
  const errors = fetcher.getErrors();

  const logMethod = errors.length ? 'error' : 'info';
  logger[logMethod]('zendesk refunds list results', {
    context,
    query,
    successCount: tickets.length,
    errorCount: errors.length,
    errors
  });

  return tickets;
}

module.exports = {
  handler,
  meta: {
    retry: { max: 1 },
    description: 'Get zendesk refund tickets',
    requestSchema: {
      type: 'object',
      properties: {
        dateField: {
          type: 'string',
          enum: API_DATE_FIELDS,
          description: 'Date field to used for filters',
          default: API_DATE_FIELDS[0]
        },
        dateFrom: {
          type: 'string',
          format: 'date',
          description: 'Filter API by {dateField} from (inclusive). Defaults to -1d'
        },
        dateTo: {
          type: 'string',
          format: 'date',
          description: 'Filter API by {dateField} to (exclusive). Defaults to now'
        }
      }
      // no required
    },
    responseSchema: {
      type: 'object',
      properties: {}
    }
  }
};
