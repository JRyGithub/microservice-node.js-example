const schemaUtils = require('carotte-schema-utils');

const PERMISSION = 'incident.status.update';

async function handler({
  data: {
    body: {
      filters: { id: endToEndIds }
    }
  },
  invoke
}) {
  const results = await invoke('incident.update-consumer-refund-status:v1', {
    filters: {
      endToEndIds
    }
  });

  return {
    body: results
  };
}

const meta = {
  description: 'Update incidents with RESOLVE or REJECT status after refund is validated by bank',
  permissions: [PERMISSION],
  requestSchema: schemaUtils.object('Request', {
    properties: {
      body: {
        properties: {
          filters: schemaUtils.object('Filters', {
            properties: {
              id: {
                type: 'array',
                items: schemaUtils.string(
                  'List of REJECTED refund end to end Ids from XML file that is uploaded to bank (Here we provide only ones that we are going to be REJECTED) others will be set as RESOLVED'
                )
              }
            }
          })
        }
      }
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: {
        type: 'object',
        properties: {
          resolved: schemaUtils.number('Number of resolved incidents'),
          rejected: schemaUtils.number('Number of rejected incidents')
        }
      }
    }
  })
};

module.exports = { handler, meta };
