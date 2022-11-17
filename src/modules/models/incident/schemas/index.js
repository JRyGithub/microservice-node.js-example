const pick = require('lodash/pick');

const schemaUtils = require('carotte-schema-utils');
const { INCIDENT_TYPES } = require('../../../incident/domain/incident');
const {
  BaseIncident,
  ORIGIN_TYPES,
  USER_TYPES
} = require('../../../incident/domain/incident/base');
const { AttachmentValidation } = require('../../../incident/domain/attachment-validation');
const { Concern } = require('../../../incident/domain/concern');

const attachment = schemaUtils.object('An attachment', {
  properties: {
    type: schemaUtils.string('Attachment type', {
      enum: Object.values(AttachmentValidation.TYPES)
    }),
    fileKey: schemaUtils.string('Cubyn file key'),
    url: schemaUtils.string('Cubyn file URL')
  }
});

const attachmentValidation = schemaUtils.object('An attachment', {
  properties: {
    id: schemaUtils.string('ID'),
    type: schemaUtils.string('Validation type', {
      enum: Object.values(AttachmentValidation.TYPES)
    }),
    status: schemaUtils.string('Validation status', {
      enum: Object.values(AttachmentValidation.STATUSES)
    })
  }
});

const concern = schemaUtils.object('A concern', {
  properties: {
    type: schemaUtils.string('Concern type', {
      enum: Object.values(Concern.TYPES)
    }),
    entityType: schemaUtils.string('Concern entity type', {
      enum: Object.values(Concern.ENTITY_TYPES)
    }),
    entityId: schemaUtils.string('Entity ID'),
    amount: schemaUtils.number('Amount of this refund'),
    amountType: schemaUtils.string('Type of this amount (PERCENT / VALUE)', {
      enum: Object.values(Concern.AMOUNT_TYPES)
    }),
    quantity: schemaUtils.number('Related quantity')
  }
});

const requester = schemaUtils.object('Requester related information', {
  properties: {
    firstName: schemaUtils.string('First Name'),
    lastName: schemaUtils.string('Last Name'),
    organizationName: schemaUtils.string('Organization name'),
    email: schemaUtils.string('Email'),
    language: schemaUtils.string('Language'),
    bankInfo: schemaUtils.object('Bank account information', {
      properties: {
        firstName: schemaUtils.string('Account first Name'),
        lastName: schemaUtils.string('Account last Name'),
        iban: schemaUtils.string('Account IBAN'),
        bic: schemaUtils.string('Account BIC'),
        country: schemaUtils.string('Country')
      },
      required: ['firstName', 'lastName', 'iban', 'bic', 'country']
    })
  },
  required: ['firstName', 'lastName', 'email', 'bankInfo']
});

const incident = schemaUtils.object('Incident related information', {
  properties: {
    type: schemaUtils.string('Incident type', {
      enum: Object.values(INCIDENT_TYPES)
    }),
    status: schemaUtils.string('Incident status', {
      enum: Object.values(BaseIncident.STATUSES)
    }),
    rejectedReason: schemaUtils.object('rejection reason, mandatory when status = REJECTED', {
      properties: {
        msg: schemaUtils.string('message, if it is not related to any of rejected reason keys'),
        key: schemaUtils.string('key of rejected reason'),
        data: schemaUtils.array('array of strings that we use to concat', {
          items: schemaUtils.string('additional info for rejected reason')
        })
      }
    }),
    refundStatus: schemaUtils.string('Incident refund status', {
      enum: Object.values(BaseIncident.REFUND_STATUSES)
    }),
    origin: schemaUtils.string(`Any origin indication`, {
      enum: Object.values(ORIGIN_TYPES)
    }),
    originId: schemaUtils.string(
      `Optional reference describing that origin.
        e.g. zendesk ticket id, transaction id when auto`
    ),
    entityType: schemaUtils.string(
      `The parent entity that will hold all concerns of this incident`,
      {
        enum: Object.values(BaseIncident.ENTITY_TYPES)
      }
    ),
    entityId: schemaUtils.string('The parent entity id'),
    source: schemaUtils.string('Source of claim', {
      enum: schemaUtils.string('Source of claim', Object.values(USER_TYPES))
    }),
    ownerId: schemaUtils.integer(
      `Owner of the ticket, defaults to currently connected user.
        To be explicitely set when impersonating a shipper via incident backoffice`
    ),
    attachments: schemaUtils.array('All document attachments required to process this incident', {
      items: attachment
    }),
    concerns: schemaUtils.array('All concerns of this incident', {
      items: concern
    }),
    attachmentValidations: schemaUtils.array('All attachments validations of this incident', {
      items: attachmentValidation
    }),
    requester
  }
});

/**
 * Removes any extra property from given payload
 * as described in given schema
 * @param  {Object} payload
 * @param  {Object} schema
 * @return {Object} sanitized payload
 */
const sanitize = (payload, schema, filter = []) => {
  if (!payload) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitize(item, schema, filter));
  }
  const fields = Object.keys(schema.properties).filter((key) => !filter.includes(key));

  return pick(payload, fields);
};

module.exports = {
  incident,
  requester,
  sanitize
};
