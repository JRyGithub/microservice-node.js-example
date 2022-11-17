const { assert, BadRequestError } = require('@devcubyn/core.errors');
const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const IncidentModel = require('../../modules/models/incident');
const {
  incident: createIncidentSchema
} = require('../../modules/incident/usecases/create-incident/schema');
const { createIncidentUsecase } = require('../../modules/incident/usecases/create-incident');
const {
  preprocessIncidentUsecase
} = require('../../modules/incident/usecases/preprocess-incident');
const { USER_TYPES } = require('../../modules/incident/domain/incident/base');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const {
  ReadsqlProductRepository
} = require('../../modules/incident/adapters/readsql-product-repository');
const { RpcItemRepository } = require('../../modules/incident/adapters/rpc-item-repository');
const {
  RpcDocumentValidationRepository
} = require('../../modules/incident/adapters/rpc-document-validation-repository');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');
const {
  PreprocessingChecks
} = require('../../modules/incident/domain/incident/preprocessing-result');
const {
  INCIDENT_TYPES
} = require('../../modules/incident/domain/incident/constants/incident-types');
const { RpcProductRepository } = require('../../modules/incident/adapters/rpc-product-repository');

const PERMISSION = 'incident.create';

async function handler(
  { data: { body = {}, query = {} }, context, invoke },
  {
    sqlProductRepository = new ReadsqlProductRepository(context),
    rpcProductRepository = new RpcProductRepository(invoke),
    itemRepository = new RpcItemRepository(invoke),
    documentValidationRepository = new RpcDocumentValidationRepository(invoke),
    messageRepository = new RpcMessageRepository(invoke)
  } = {}
) {
  const { requester, source, type } = body;

  if (source === USER_TYPES.RECIPIENT) {
    assert(requester, BadRequestError, 'Missing requester details');
  } else if (source === USER_TYPES.SHIPPER) {
    assert(!requester, BadRequestError, 'No requester for shipper');
  }

  const isDryRun = query['dry-run'] === 'true' || query['dry-run'] === true;
  const ownerId = readImpersonatedOwnerId(body, context);
  const payload = {
    attachments: [],
    ...body,
    returns: type !== INCIDENT_TYPES.CONSUMER_RETURN ? null : body.returns,
    ownerId
  };

  if (isDryRun) {
    return dryRun({ payload, sqlProductRepository, rpcProductRepository, itemRepository });
  }

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const createIncident = createIncidentUsecase({
      incidentRepository,
      sqlProductRepository,
      rpcProductRepository,
      itemRepository,
      documentValidationRepository,
      messageRepository
    });

    const incident = await createIncident.execute(payload);

    await trx.commit();

    createIncident.notify(incident);

    return {
      body: incident.id
    };
  } catch (error) {
    await trx.rollback();

    throw error;
  }
}

async function dryRun({ payload, sqlProductRepository, rpcProductRepository, itemRepository }) {
  const incidentRepository = new SqlIncidentRepository();

  const preprocessIncident = preprocessIncidentUsecase({
    sqlProductRepository,
    rpcProductRepository,
    itemRepository,
    incidentRepository
  });

  const { preprocessing } = await preprocessIncident.execute(payload);

  return {
    body: {
      success: !preprocessing.hasErrors(),
      checks: preprocessing.checks
    }
  };
}

/**
 * If command is impersonated, check that user
 * has the correct permissions
 *
 * @param {Object} body
 * @param {Object} context
 */
function readImpersonatedOwnerId(body, context) {
  const { permissions = { [PERMISSION]: [{}] } } = context;
  const { ownerId, source } = body;

  if (source === 'RECIPIENT') return null;

  // currently connected user is scoped to permission.ownerId,
  // we completely discard ownerId value from the body
  const targetPermission = permissions[PERMISSION];

  if (
    targetPermission &&
    targetPermission.length &&
    targetPermission[0].ownerId &&
    targetPermission[0].ownerId.length
  ) {
    return targetPermission[0].ownerId[0];
  }

  // otherwise, currently connected user has impersonation permission
  // it HAS TO explicitely define on which ownerId the incident shall be created
  assert(ownerId, BadRequestError, 'Missing ownerId');

  return ownerId;
}

const meta = {
  description: 'Create a new incident',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    required: ['body'],
    properties: { body: createIncidentSchema.input }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: {
        oneOf: [
          // when dry run is false
          createIncidentSchema.output,
          // when dry run is true
          schemaUtils.object('Response when dry-run is true', {
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
          })
        ]
      }
    }
  })
};

module.exports = { handler, meta };
