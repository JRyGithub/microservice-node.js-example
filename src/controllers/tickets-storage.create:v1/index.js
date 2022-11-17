const schemaUtils = require('carotte-schema-utils');
const { TICKET_TYPES, TICKET_REASON_TYPES } = require('../../modules/models/entity-type/constants');
const { supportTicketCreateResponse } = require('../../lambdas/support.ticket.create:v1/schema');

async function handler({ data, invoke, context }) {
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

  return {
    body: await invoke('support.ticket.create:v1', {
      userId: context.user.id,
      referenceId: data.body.referenceId,
      type: data.body.type,
      ticket,
      isDryRun
    })
  };
}

const meta = {
  description: 'Controller to create a support ticket for storage app',
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
        required: ['type', 'referenceId', 'reason', 'requester'],
        properties: {
          referenceId: {
            oneOf: [{ type: 'string' }, { type: 'integer' }]
          },
          type: schemaUtils.string('Ticket type', { enum: Object.values(TICKET_TYPES) }),
          reason: schemaUtils.string('Ticket reason'),
          reasonType: schemaUtils.string('Ticket reason type', {
            enum: Object.values(TICKET_REASON_TYPES)
          }),
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
              GENERAL: schemaUtils.array('files', {
                items: schemaUtils.object('file', {
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
