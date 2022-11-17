const request = require('request-promise-native');
const chunk = require('lodash/chunk');
const { assert } = require('@devcubyn/core.errors');
const env = require('../../env');

assert(
  env.ZENDESK_DOMAIN,
  Error,
  'Service badly configured missing environment variable [ZENDESK_DOMAIN]'
);
assert(
  env.ZENDESK_EMAIL,
  Error,
  'Service badly configured missing environment variable [ZENDESK_EMAIL]'
);
assert(
  env.ZENDESK_FIELD_REFUND_STATUS,
  Error,
  'Service badly configured missing environment variable [ZENDESK_FIELD_REFUND_STATUS]'
);
assert(
  env.ZENDESK_PASSWORD,
  Error,
  'Service badly configured missing environment variable [ZENDESK_PASSWORD]'
);
assert(
  env.ZENDESK_AUTHOR_ID,
  Error,
  'Service badly configured missing environment variable [ZENDESK_AUTHOR_ID]'
);

const uri = `https://${env.ZENDESK_DOMAIN}.zendesk.com/api/v2/tickets/update_many.json`;
const ZENDESK_FIELD_REFUND_STATUS_ID = env.ZENDESK_FIELD_REFUND_STATUS.split(',')[1];
const TICKET_CHUNK_LIMIT = 100;

function formatPayload(tickets) {
  return tickets.map((ticket) => ({
    id: ticket.ticketId,
    custom_fields: [{ id: ZENDESK_FIELD_REFUND_STATUS_ID, value: ticket.status }]
  }));
}

async function handler({ data }) {
  const ticketsChunks = chunk(data.body, TICKET_CHUNK_LIMIT);

  const answers = await Promise.all(
    ticketsChunks.map(async (ticketsChunk) =>
      request({
        method: 'PUT',
        uri,
        auth: {
          user: env.ZENDESK_EMAIL,
          pass: env.ZENDESK_PASSWORD
        },
        body: {
          tickets: formatPayload(ticketsChunk)
        },
        json: true,
        forever: true
      })
    )
  );

  return answers;
}

module.exports = {
  handler,
  meta: {
    description: 'Update zendesk refund tickets status',
    requestSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ticketId: {
                type: 'number',
                description: 'Ticket id'
              },
              status: {
                enum: ['Rejected', 'Pending', 'Validated', 'Processed', 'Paid'],
                description: 'The refund status to update'
              }
            }
          }
        }
      }
    },
    responseSchema: {
      type: 'object',
      properties: {}
    }
  }
};
