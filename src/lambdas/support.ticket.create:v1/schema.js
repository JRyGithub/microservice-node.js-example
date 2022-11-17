const schemaUtils = require('carotte-schema-utils');
const { TICKET_TYPES } = require('../../modules/models/entity-type/constants');
const {
  PreprocessingChecks
} = require('../../modules/incident/domain/incident/preprocessing-result');

const supportTicketCreateResponse = {
  oneOf: [
    schemaUtils.object('Response when it is not a claim and dry-run is false', {
      properties: {
        id: schemaUtils.integer('Ticket id'),
        type: schemaUtils.string('Ticket type', { enum: Object.values(TICKET_TYPES) }),
        description: schemaUtils.string('Ticket description'),
        referenceId: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
        subject: schemaUtils.string('Ticket subject'),
        createdAt: schemaUtils.date('Ticket creation date'),
        updatedAt: schemaUtils.date('Ticket last update date')
      }
    }),
    schemaUtils.object('Response when it is not a claim and dry-run is true', {
      properties: {
        success: schemaUtils.boolean('true if incident would have been accepted'),
        checks: schemaUtils.array('List of preprocessing checks', {
          items: schemaUtils.object('Preprocessing check result', {
            properties: {
              type: schemaUtils.string('Check type', {
                enum: Object.values(PreprocessingChecks)
              }),
              success: schemaUtils.boolean('Is successful'),
              details: schemaUtils.object('Any relevant detail of this check')
            }
          })
        })
      }
    }),
    schemaUtils.object('Response when it is a claim', {
      properties: {
        id: schemaUtils.string('Incident id')
      }
    })
  ]
};

module.exports = { supportTicketCreateResponse };
