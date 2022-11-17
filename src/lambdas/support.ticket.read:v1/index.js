const schemaUtils = require('carotte-schema-utils');

const zendeskTicket = require('../../drivers/zendesk/ticket');
const { TICKET_TYPES } = require('../../modules/models/entity-type/constants');

async function handler({ data, context }) {
  return zendeskTicket.read({
    type: data.type,
    referenceId: data.referenceId,
    context
  });
}

const meta = {
  description: 'Fetch ticket information by entity',
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    required: ['type', 'referenceId'],
    properties: {
      type: schemaUtils.string('Ticket type', { enum: Object.values(TICKET_TYPES) }),
      referenceId: schemaUtils.integer('Entity id')
    }
  }),
  responseSchema: schemaUtils.integer('Ticket id')
};

module.exports = { handler, meta };
