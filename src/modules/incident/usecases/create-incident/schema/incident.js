const schemaUtils = require('carotte-schema-utils');
const { AttachmentValidation } = require('../../../domain/attachment-validation');
const { INCIDENT_TYPES, INCIDENT_ENTITY_TYPES } = require('../../../domain/incident');
const { USER_TYPES } = require('../../../domain/incident/base');
const { requester } = require('./requester');

const input = schemaUtils.object('Payload', {
  properties: {
    type: schemaUtils.string('Incident type', { enum: Object.values(INCIDENT_TYPES) }),
    origin: schemaUtils.string(
      `Any origin indication.
                e.g. ZENDESK, OMS, SHIPPER, AUTO`
    ),
    originId: schemaUtils.string(
      `Optional reference describing that origin.
            e.g. zendesk ticket id, transaction id when auto`
    ),
    entityType: schemaUtils.string('The parent entity type', {
      enum: Object.values(INCIDENT_ENTITY_TYPES)
    }),
    entityId: schemaUtils.string('The parent entity id'),
    ownerId: schemaUtils.integer(
      `Owner of the ticket, defaults to currently connected user.
            To be explicitely set when impersonating a shipper via incident backoffice`
    ),
    attachments: schemaUtils.array('All document attachments required to process this incident', {
      items: schemaUtils.object('An attachment', {
        properties: {
          type: { enum: Object.values(AttachmentValidation.TYPES) },
          fileKey: schemaUtils.string('Cubyn file key')
        },
        required: ['type', 'fileKey']
      })
    }),
    source: schemaUtils.string('Source of claim', { enum: Object.values(USER_TYPES) }),
    requester
  },
  required: ['type', 'origin', 'entityType', 'entityId']
});

const output = schemaUtils.string('Incident id created');

module.exports = {
  input,
  output
};
