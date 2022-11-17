const schemaUtils = require('carotte-schema-utils');
const { assert, BadRequestError } = require('@devcubyn/core.errors');
const metaUtils = require('../../modules/meta-utils');

async function handler({ data, invoke }) {
  assert(
    data.filters && data.filters.recipientEmail,
    BadRequestError,
    'Filters with recipientEmail is required'
  );

  const { recipientEmail } = data.filters;
  const { metaQuery, TICKET_STATUS } = metaUtils;

  const awaitingCubynQuery = metaQuery(recipientEmail, {
    $in: [TICKET_STATUS.NEW, TICKET_STATUS.OPEN, TICKET_STATUS.HOLD]
  });
  const totalQuery = metaQuery(recipientEmail, { $ne: TICKET_STATUS.CLOSED });
  const awaitingShipperQuery = metaQuery(recipientEmail, TICKET_STATUS.PENDING);
  const closedTicketsQuery = metaQuery(recipientEmail, TICKET_STATUS.SOLVED);

  const [total, awaitingCubynTotal, awaitingShipperTotal, closedTotal] = await Promise.all([
    invoke('parcel-meta.count:v1', { filters: { query: totalQuery } }),
    invoke('parcel-meta.count:v1', { filters: { query: awaitingCubynQuery } }),
    invoke('parcel-meta.count:v1', { filters: { query: awaitingShipperQuery } }),
    invoke('parcel-meta.count:v1', { filters: { query: closedTicketsQuery } })
  ]);

  return {
    total,
    awaitingCubynTotal,
    awaitingShipperTotal,
    closedTotal
  };
}

const meta = {
  description: 'Zendesk ticket count summary',
  permissions: ['ticket.read'],
  requestSchema: schemaUtils.object('Request', {
    properties: {
      filters: schemaUtils.object('filters', {
        required: ['recipientEmail'],
        properties: {
          recipientEmail: schemaUtils.string('recipientEmail')
        }
      })
    },
    required: ['filters']
  }),
  responseSchema: schemaUtils.array(
    'Array of total, cubyn total, shipper total and closed total ticket counts',
    {
      items: schemaUtils.object('count summary', {
        total: schemaUtils.number('total'),
        awaitingCubynTotal: schemaUtils.number('awaitingCubynTotal'),
        awaitingShipperTotal: schemaUtils.number('awaitingShipperTotal'),
        closedTotal: schemaUtils.number('closedTotal')
      })
    }
  )
};

module.exports = { handler, meta };
