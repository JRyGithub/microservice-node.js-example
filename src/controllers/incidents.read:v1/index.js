const schemaUtils = require('carotte-schema-utils');
const { ResourceNotFoundError, assert } = require('@devcubyn/core.errors');
const { incident: incidentSchema } = require('../../modules/models/incident/schemas');

const PERMISSION = 'incident.read';

async function handler({ data: { params, query = {} }, invoke }) {
  const { id } = params;
  const { includes = [] } = query;

  const results = await invoke('incident.list:v1', {
    filters: { id },
    includes
  });

  assert(results.items.length === 1, ResourceNotFoundError, 'Incident', id);

  const [incident] = results.items;

  return { body: incident };
}

const meta = {
  description: 'Get an incident details',
  // @FIXME
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    properties: {
      params: schemaUtils.object('Params', {
        properties: {
          id: schemaUtils.string('ID of the incident')
        },
        required: ['id']
      }),
      query: schemaUtils.object('Query', {
        properties: {
          includes: schemaUtils.array('Includes')
        }
      })
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: incidentSchema
    }
  })
};

module.exports = { handler, meta };
