const schemaUtils = require('carotte-schema-utils');
const { TICKET_TYPES, TICKET_REASON_TYPES } = require('../../modules/models/entity-type/constants');
const { supportTicketCreateResponse } = require('../../lambdas/support.ticket.create:v1/schema');

function handler({ data, invoke, context }) {
  const { query } = data;

  const isDryRun = query['dry-run'] === 'true' || query['dry-run'] === true;

  const ticket = {
    reason: data.body.reason,
    reasonType: data.body.reasonType,
    comment: data.body.comment,
    fileMap: data.body.fileMap,
    requester: data.body.requester,
    collaborators: data.body.collaborators
  };

  return invoke('support.ticket.create:v1', {
    type: TICKET_TYPES.ORDER,
    userId: context.user.id,
    referenceId: data.body.parcelId,
    collectId: data.body.collectId,
    ticket,
    isDryRun
  });
}

const meta = {
  description: 'Controller to create a support ticket',
  permissions: ['ticket.create'],
  retry: {
    max: 2
  },
  requestSchema: schemaUtils.object('Request', {
    required: ['body'],
    properties: {
      query: schemaUtils.object('Query params', {
        properties: {
          'dry-run': {
            oneOf: [{ type: 'string' }, { type: 'boolean' }]
          }
        }
      }),
      body: schemaUtils.object('Request body', {
        required: ['parcelId', 'reason'],
        properties: {
          parcelId: {
            oneOf: [{ type: 'string' }, { type: 'integer' }]
          },
          collectId: {
            oneOf: [{ type: 'string' }, { type: 'integer' }]
          },
          reasonType: schemaUtils.string('Ticket reason type', {
            enum: Object.values(TICKET_REASON_TYPES)
          }),
          reason: schemaUtils.string('Ticket reason'),
          requester: schemaUtils.string('Requester'),
          collaborators: schemaUtils.array('CC', {
            items: schemaUtils.string('CC email', { format: 'email' })
          }),
          comment: schemaUtils.string('Ticket comment', {
            // cf https://github.com/cubyn/service-support/commit/23a1771fe1288b871a0697e32459594c131d1835
            maxLength: 10000
          }),
          fileMap: schemaUtils.object('Files', {
            properties: {
              INVOICE: schemaUtils.array('Invoice files', {
                items: schemaUtils.object('Invoice file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              }),
              OTHER: schemaUtils.array('Other files', {
                items: schemaUtils.object('Other file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              }),
              SHIPCLAIM: schemaUtils.array('Shipclaim files', {
                items: schemaUtils.object('Shipclaim file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              }),
              PICTURE: schemaUtils.array('Invoice files', {
                items: schemaUtils.object('Invoice file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              }),
              ID: schemaUtils.array('Invoice files', {
                items: schemaUtils.object('Invoice file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              }),
              RECLAIM: schemaUtils.array('Invoice files', {
                items: schemaUtils.object('Invoice file', {
                  properties: {
                    fileName: schemaUtils.string('File name'),
                    fileKey: schemaUtils.string('File key')
                  }
                })
              })
            }
          })
        }
      })
    }
  }),
  responseSchema: supportTicketCreateResponse
};

module.exports = { handler, meta };
