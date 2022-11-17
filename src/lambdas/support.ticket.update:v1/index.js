const schemaUtils = require('carotte-schema-utils');

const zendeskTicket = require('../../drivers/zendesk/ticket');
const getData = require('../../drivers/cubyn-data');
const { TICKET_TYPES } = require('../../modules/models/entity-type/constants');

async function handler({ data, invoke, publish, context }) {
  const { entityData } = await getData({ data, invoke, context }, false);

  return zendeskTicket.update({
    type: data.type,
    ticketId: data.ticketId,
    data: entityData,
    publish,
    invoke,
    context
  });
}

const meta = {
  description: 'Update ticket in zendesk',
  public: true,
  retry: { max: 0 },
  requestSchema: schemaUtils.object('Request', {
    required: ['ticketId', 'type', 'referenceId'],
    properties: {
      ticketId: schemaUtils.integer('Ticket id'),
      type: schemaUtils.string('Ticket type', { enum: Object.values(TICKET_TYPES) }),
      referenceId: { oneOf: [{ type: 'string' }, { type: 'integer' }] }
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      response: schemaUtils.string('Response status')
    }
  })
};

module.exports = { handler, meta };
