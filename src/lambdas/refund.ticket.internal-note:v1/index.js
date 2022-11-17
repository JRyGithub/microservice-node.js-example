const request = require('request-promise-native');
const { assert } = require('@devcubyn/core.errors');
const { ApiError } = require('@devcubyn/core.errors');
const logger = require('../../drivers/logger');
const env = require('../../env');

assert(
  env.ZENDESK_DOMAIN,
  Error,
  'Service badly configured missing environment variable [ZENDESK_DOMAIN]'
);
assert(
  env.ZENDESK_EMAIL,
  Error,
  'Service badly configured missing environment variable [ZENDESK_EMAIL]'
);
assert(
  env.ZENDESK_PASSWORD,
  Error,
  'Service badly configured missing environment variable [ZENDESK_PASSWORD]'
);
assert(
  env.ZENDESK_AUTHOR_ID,
  Error,
  'Service badly configured missing environment variable [ZENDESK_AUTHOR_ID]'
);

const ZENDESK_STATUS_ERROR_CODE = {
  StatusCodeError: 'StatusCodeError'
};

const ZENDESK_ERROR_TYPE = {
  RecordInvalid: 'RecordInvalid'
};

async function handler({ data, context }) {
  const {
    body: { ticketId: id, message }
  } = data;

  try {
    const result = await request({
      method: 'PUT',
      uri: `https://${env.ZENDESK_DOMAIN}.zendesk.com/api/v2/tickets/${id}.json`,
      auth: {
        user: env.ZENDESK_EMAIL,
        pass: env.ZENDESK_PASSWORD
      },
      body: {
        ticket: {
          comment: {
            body: message,
            author_id: env.ZENDESK_AUTHOR_ID,
            public: false
          }
        }
      },
      json: true,
      forever: true
    });

    return result;
  } catch (error) {
    const { name } = error;

    if (name === ZENDESK_STATUS_ERROR_CODE.StatusCodeError) {
      const {
        error: { error: zendeskErrorType, description: zendeskErrorDescription }
      } = error;

      if (
        zendeskErrorType === ZENDESK_ERROR_TYPE.RecordInvalid &&
        zendeskErrorDescription === 'Status: closed prevents ticket update'
      ) {
        logger.warn('Zendesk error due to ticket already closed', { id, error, context });

        return null;
      }
    }

    logger.error('Zendesk internal note error', { id, error, context });

    throw new ApiError(error.message);
  }
}

module.exports = {
  handler,
  options: { prefetch: 1 },
  meta: {
    description: 'Add internal note',
    requestSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'obejct',
          properties: {
            ticketId: {
              type: 'number',
              description: 'Ticket id'
            },
            message: {
              type: 'string',
              description: 'Message to send to internal note'
            }
          }
        }
      }
    },
    responseSchema: {
      type: 'object',
      properties: {}
    }
  }
};
