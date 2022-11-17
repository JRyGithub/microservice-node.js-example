const schemaUtils = require('carotte-schema-utils');
const { AttachmentValidation } = require('../../../domain/attachment-validation');
const { INCIDENT_TYPES, INCIDENT_ENTITY_TYPES } = require('../../../domain/incident');
const { USER_TYPES } = require('../../../domain/incident/base');
const { requester } = require('./requester');

const input = schemaUtils.object('Payload', {
  properties: {
    type: schemaUtils.string('Claim type', { enum: Object.values(INCIDENT_TYPES) }),
    entityType: schemaUtils.string('The parent entity type', {
      enum: Object.values(INCIDENT_ENTITY_TYPES)
    }),
    entityId: schemaUtils.string('The entity id of mentioned entity type'),
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
  required: ['type', 'entityType', 'entityId', 'source']
});

const output = schemaUtils.string('Incident id created');

module.exports = {
  input,
  output
};
