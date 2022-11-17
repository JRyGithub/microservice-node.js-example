const schemaUtils = require('carotte-schema-utils');
const { assert, BadRequestError } = require('@devcubyn/core.errors');

// modules
const { TYPES, TICKET_TYPES } = require('../../modules/models/entity-type/constants');
const { INCIDENT_TYPES } = require('../../modules/incident/domain/incident');
const { IncidentRequest } = require('../../modules/incident/usecases/incident-request');
// modules/incident/adapters
const {
  ReadsqlProductRepository
} = require('../../modules/incident/adapters/readsql-product-repository');
const { RpcItemRepository } = require('../../modules/incident/adapters/rpc-item-repository');
const {
  RpcDocumentValidationRepository
} = require('../../modules/incident/adapters/rpc-document-validation-repository');

// modules/support-request
const { SupportRequest } = require('../../modules/zendesk-support/usecases/support-request');

const { supportTicketCreateResponse } = require('./schema');

// when shipper user create a request, a sku lost in warehouse must be a support request.
// A Cubyn agent will decide to transform it in incident request
function isClaim(reasonType) {
  return Object.keys(INCIDENT_TYPES)
    .filter((type) => type !== INCIDENT_TYPES.PRODUCT_LOST_IN_WAREHOUSE)
    .includes(reasonType);
}

async function handler(
  { data, invoke, publish, context },
  {
    productRepository = new ReadsqlProductRepository(context),
    itemRepository = new RpcItemRepository(invoke),
    documentValidationRepository = new RpcDocumentValidationRepository(invoke)
  } = {}
) {
  assert(data.userId, BadRequestError, 'data.userId is required');
  assert(data.ticket, BadRequestError, 'data.ticket is required');
  assert(data.referenceId, BadRequestError, 'data.referenceId is required');
  assert(data.type, BadRequestError, 'data.type is required');
  assert(TYPES[data.type], BadRequestError, 'invalid data.type', data.type);
  const { isDryRun = false } = data;

  if (!isClaim(data.ticket.reasonType) && !isDryRun) {
    const supportRequest = new SupportRequest({ invoke, publish, context });
    const zendeskTicket = await supportRequest.execute(data);

    return zendeskTicket;
  }
  const incidentRequest = new IncidentRequest({
    productRepository,
    itemRepository,
    documentValidationRepository
  });

  const incident = await incidentRequest.execute(data);

  return incident;
}

const meta = {
  description: 'Create or add the support ticket',
  permissions: ['ticket.create'],
  requestSchema: schemaUtils.object('Request', {
    required: ['ticket', 'referenceId', 'userId', 'type'],
    properties: {
      ticket: schemaUtils.object('Ticket informatons'),
      type: schemaUtils.string('Ticket type', { enum: Object.values(TICKET_TYPES) }),
      userId: schemaUtils.integer('User ID'),
      referenceId: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
      isDryRun: schemaUtils.boolean('Dry run the incident creation, validating its requirements')
    }
  }),
  responseSchema: supportTicketCreateResponse
};

module.exports = { handler, meta };
