const schemaUtils = require('carotte-schema-utils');
const { TICKET_TYPES } = require('../../modules/models/entity-type/constants');

async function handler({ data, invoke, context }) {
  const {
    params: { id: referenceId },
    query: { type }
  } = data;

  return {
    body: { ticketId: await invoke('support.ticket.read:v1', { type, referenceId, context }) }
  };
}

const meta = {
  description: 'Controller to fetch ticket by entity',
  permissions: ['ticket.create'],
  retry: { max: 1 },
  requestSchema: schemaUtils.object('Request', {
    required: ['query'],
    properties: {
      query: {
        type: 'object',
        properties: {
          type: schemaUtils.string('Entity type', { enum: Object.values(TICKET_TYPES) })
        }
      }
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: {
        ticketId: schemaUtils.integer('Ticket id')
      }
    }
  })
};

module.exports = { handler, meta };
