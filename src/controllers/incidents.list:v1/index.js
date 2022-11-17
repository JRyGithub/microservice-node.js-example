const schemaUtils = require('carotte-schema-utils');
const {
  incident: incidentSchema,
  requester: requesterSchema,
  sanitize
} = require('../../modules/models/incident/schemas');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { INCIDENT_TYPES } = require('../../modules/incident/domain/incident');

const PERMISSION = 'incident.read';
const INCIDENT_LIST_PAGE_SIZE = 50;

async function handler({ data: { query }, invoke }) {
  const { filters = {} } = query || {};
  const { limit = INCIDENT_LIST_PAGE_SIZE, offset = 0, includes } = query || {};

  const incidents = await invoke('incident.list:v1', {
    filters,
    limit,
    offset,
    includes
  });

  let { items } = incidents;
  const { count } = incidents;

  // filter bankinfo
  items = items.map((item) => {
    // eslint-disable-next-line no-param-reassign
    item.requester = sanitize(item.requester, requesterSchema, ['bankInfo']);

    return item;
  });

  return {
    body: items,
    headers: {
      'x-total-count': count,
      'Access-Control-Expose-Headers': 'x-total-count'
    }
  };
}

const singleOrArray = (itemSchema) => ({
  anyOf: [itemSchema, { type: 'array', items: itemSchema }]
});

const meta = {
  description: 'List incidents by ownerId, status or refundId',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    properties: {
      query: schemaUtils.object('Query', {
        properties: {
          filters: schemaUtils.object('Filters', {
            properties: {
              id: schemaUtils.string('Id of the incident'),
              status: singleOrArray(
                schemaUtils.string('Status of the incident', {
                  enum: Object.values(BaseIncident.STATUSES)
                })
              ),
              refundStatus: singleOrArray(
                schemaUtils.string('Refund status of the incident', {
                  enum: Object.values(BaseIncident.REFUND_STATUSES)
                })
              ),
              type: singleOrArray(
                schemaUtils.string('Refund status of the incident', {
                  enum: Object.values(INCIDENT_TYPES)
                })
              ),
              ownerId: schemaUtils.number('Owner of the incident'),
              parcelId: schemaUtils.string('Parcel number that incident is related to')
            }
          }),
          limit: schemaUtils.number('Limit', {
            default: INCIDENT_LIST_PAGE_SIZE
          }),
          offset: schemaUtils.number('Offset', {
            default: 0
          }),
          includes: schemaUtils.array('Includes')
        }
      })
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: schemaUtils.array('Array of Incidents', { items: incidentSchema }),
      headers: schemaUtils.object({
        properties: {
          'x-total-count': schemaUtils.integer('Number of incidents for the current query'),
          'Access-Control-Expose-Headers': schemaUtils.string()
        }
      })
    }
  })
};

module.exports = { handler, meta };
