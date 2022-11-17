const schemaUtils = require('carotte-schema-utils');

const PERMISSION = 'ticket.read';

async function handler({ invoke, context }) {
  const request = {
    auth: context.permissions[PERMISSION] || {},
    filters: { recipientEmail: context.user.email }
  };

  return { body: await invoke('support.ticket.count:v1', request) };
}

const meta = {
  description: 'Controller obtain zendesk ticket count summary for a shipper',
  permissions: [PERMISSION],
  retry: {
    max: 2
  },
  requestSchema: schemaUtils.object('Request', {}),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: schemaUtils.array('array of ticket counts', {
        items: schemaUtils.object('ticket counts', {
          total: schemaUtils.number('total'),
          awaitingCubynTotal: schemaUtils.number('awaitingCubynTotal'),
          awaitingShipperTotal: schemaUtils.number('awaitingShipperTotal'),
          closedTotal: schemaUtils.number('closedTotal')
        })
      })
    }
  })
};

module.exports = { handler, meta };
