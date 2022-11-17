const { assert, BadRequestError } = require('@devcubyn/core.errors');
const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const IncidentModel = require('../../modules/models/incident');
const {
  claim: createIncidentSchema
} = require('../../modules/incident/usecases/create-incident/schema');
const { createIncidentUsecase } = require('../../modules/incident/usecases/create-incident');
const {
  USER_TYPES,
  BaseIncident,
  ORIGIN_TYPES
} = require('../../modules/incident/domain/incident/base');
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
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { CLAIM_ROLES } = require('../../modules/models/claim');
const {
  INCIDENT_TYPES
} = require('../../modules/incident/domain/incident/constants/incident-types');
const { RpcProductRepository } = require('../../modules/incident/adapters/rpc-product-repository');
const { RpcFileRepository } = require('../../modules/incident/adapters/rpc-file-repository');

const PERMISSION = 'incident.create';

async function handler(
  { data: { body = {} }, context, invoke },
  {
    sqlProductRepository = new ReadsqlProductRepository(context),
    rpcProductRepository = new RpcProductRepository(invoke),
    itemRepository = new RpcItemRepository(invoke),
    documentValidationRepository = new RpcDocumentValidationRepository(invoke),
    messageRepository = new RpcMessageRepository(invoke),
    parcelRepository = new RpcParcelRepository(invoke),
    fileRepository = new RpcFileRepository(invoke)
  } = {}
) {
  const { requester, source, type, entityType } = body;
  let ownerId;

  assert(
    entityType !== BaseIncident.ENTITY_TYPES.ITEM,
    BadRequestError,
    `Entity type ${entityType} is not supported`
  );

  if (source === USER_TYPES.RECIPIENT) {
    assert(
      entityType === BaseIncident.ENTITY_TYPES.PARCEL,
      BadRequestError,
      'For recipient can claim only PARCEL entity type'
    );
    const verified = await verifyRecipientClaim({ body, context, parcelRepository });

    assert(verified, BadRequestError, 'Your request is not verified');
    assert(requester, BadRequestError, 'Missing requester details');
  } else {
    assert(!requester, BadRequestError, 'No requester for shipper');

    ownerId = readImpersonatedOwnerId(context);
    assert(ownerId, BadRequestError, 'No owner for shipper identified');
  }

  const payload = {
    attachments: [],
    ...body,
    origin: ORIGIN_TYPES.API,
    returns: type !== INCIDENT_TYPES.CONSUMER_RETURN ? null : body.returns,
    ownerId
  };

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const createIncident = createIncidentUsecase({
      incidentRepository,
      sqlProductRepository,
      rpcProductRepository,
      itemRepository,
      documentValidationRepository,
      messageRepository,
      fileRepository
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
/**
 * Validation for recipient claim (Check shipper provided matches entityId)
 *
 * @param {Object} param.body
 * @param {Object} param.context
 * @param {RpcParcelRepository} param.parcelRespoditory
 */
async function verifyRecipientClaim({ body, context, parcelRepository }) {
  const {
    user: { roles },
    permissions = []
  } = context;
  const { relatedShipperId, entityId } = body;

  assert(relatedShipperId, BadRequestError, 'relatedShipperId is not provided');

  assert(
    Object.keys(permissions).includes(PERMISSION),
    BadRequestError,
    `You don't have permissions to create claim`
  );
  if (!roles.some((role) => Object.values(CLAIM_ROLES).includes(role))) return false;

  const parcel = await parcelRepository.findById({
    id: entityId,
    includes: ['parcel.admin']
  });

  return parcel.shipperId === parseInt(relatedShipperId, 10);
}

/**
 * If command is impersonated, check that user
 * has the correct permissions
 *
 * @param {Object} context
 */
function readImpersonatedOwnerId(context) {
  const { permissions = { [PERMISSION]: [{}] }, user } = context;

  const targetPermission = permissions[PERMISSION];

  if (
    targetPermission &&
    targetPermission.length &&
    targetPermission[0].ownerId &&
    targetPermission[0].ownerId.length
  ) {
    return targetPermission[0].ownerId[0];
  }

  if (!user) return null;

  const { roles, id } = user;

  if (!roles || !roles.some((role) => Object.values(CLAIM_ROLES).includes(role))) return null;

  return id;
}

const meta = {
  description: 'Create a new claim',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    required: ['body'],
    properties: { body: createIncidentSchema.input }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: { body: createIncidentSchema.output }
  })
};

module.exports = { handler, meta };
