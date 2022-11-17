const schemaUtils = require('carotte-schema-utils');

const { assert, BadRequestError } = require('@devcubyn/core.errors');
const { TICKET_TYPES } = require('../../modules/models/entity-type/constants');
const formatFunctions = require('../../drivers/zendesk/format-functions');
const logger = require('../../drivers/logger');

function handler({ data, invoke, context }) {
  const { valid, message, type = null, referenceId = null } = validateAndNormalize(data.body);

  if (!valid) {
    logger.warn(message, { body: data.body, context });

    return true;
  }

  logger.info('Ticket update called (post validation)', { referenceId, type, context });

  return invoke('support.ticket.update:v1', {
    ticketId: data.body.id,
    type,
    referenceId
  });
}

function validateAndNormalize(data) {
  // Default type
  const type = data.type || TICKET_TYPES.ORDER;

  // Because ORDER and RETURN_ORDER is basically the same type which uses the same fields
  // we do not create another custom field in zendesk for RETURN_ORDER referenceId, we use
  // ORDER referenceId
  const typeToFetchReferenceId = type === TICKET_TYPES.RETURN_ORDER ? TICKET_TYPES.ORDER : type;

  try {
    assert(data.id, BadRequestError, 'Ticket id has not been passed');
    assert(TICKET_TYPES[type], BadRequestError, 'Unknown ticket type');
    assert(data.referenceIds, BadRequestError, 'Reference ids has not been passed');
    assert(
      data.referenceIds[typeToFetchReferenceId],
      BadRequestError,
      'Reference id has not been passed'
    );
  } catch (err) {
    // Even if the validation fails we cannot throw the Error, we need to return
    // a success response to not have our automation deactivated by zendesk
    return { valid: false, message: err.message };
  }

  let referenceId = data.referenceIds[typeToFetchReferenceId];

  if (type === TICKET_TYPES.ORDER || type === TICKET_TYPES.RETURN_ORDER) {
    referenceId = formatFunctions.revertFormatOrderPID(referenceId);
  } else if (type === TICKET_TYPES.INVOICE) {
    referenceId = formatFunctions.revertPrettyInvoiceId(referenceId);
  }

  return {
    valid: true,
    message: null,
    type,
    referenceId
  };
}

// eslint-disable-next-line cubyn/meta-permissions
const meta = {
  description: 'Controller to update ticket in zendesk',
  public: true,
  retry: { max: 0 },
  requestSchema: schemaUtils.object('Request', {
    required: ['body'],
    properties: {
      body: schemaUtils.object('Request body', {
        properties: {
          id: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
          type: schemaUtils.string('Ticket type'),
          referenceIds: schemaUtils.object('Reference ids from which we will take the needed one', {
            properties: {
              ORDER: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
              WIO: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
              INVOICE: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
              SKU: { oneOf: [{ type: 'string' }, { type: 'integer' }] }
            }
          })
        }
      })
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      response: schemaUtils.string('Response status')
    }
  })
};

module.exports = {
  handler,
  meta,
  options: { prefetch: 1 }
};
