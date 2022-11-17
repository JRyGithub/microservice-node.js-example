const schemaUtils = require('carotte-schema-utils');
const { assert, BadRequestError } = require('@devcubyn/core.errors');
const {
  incident: incidentSchema,
  requester: requesterSchema,
  sanitize
} = require('../../modules/models/incident/schemas');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { INCIDENT_TYPES } = require('../../modules/incident/domain/incident');
const { CLAIM_ROLES } = require('../../modules/models/claim');

const PERMISSION = 'incident.read';
const INCIDENT_LIST_PAGE_SIZE = 50;

async function handler({ data: { query }, invoke, context }) {
  let { filters = {} } = query || {};
  const { limit = INCIDENT_LIST_PAGE_SIZE, offset = 0, includes } = query || {};
  const { user } = context;

  assert(user && user.id, BadRequestError, 'List can be retrieved only by user');

  const { roles } = user;

  const userHadValidRole = roles && roles.some((role) => Object.values(CLAIM_ROLES).includes(role));

  assert(userHadValidRole, BadRequestError, 'User does not have sufficient rights');

  filters = {
    ...filters,
    ownerId: user.id,
    relatedShipperId: user.id
  };

  const incidents = await invoke('incident.list:v1', {
    filters,
    limit,
    offset,
    includes
  });

  const { count } = incidents;
  let { items } = incidents;

  // filter unnecessary data
  items = sanitize(items, incidentSchema, ['attachmentValidations']);

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
  description: 'List of claims by ownerId',
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
              ownerId: schemaUtils.number('Owner of the incident')
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
