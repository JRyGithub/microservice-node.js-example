const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const IncidentModel = require('../../modules/models/incident');
const {
  ResourceNotFoundError,
  InvalidAttachmentValidationPayloadError
} = require('../../modules/incident/errors');
const globalLogger = require('../../drivers/logger');
const {
  updateAttachmentValidationStatusUsecase: usecase
} = require('../../modules/incident/usecases/update-attachment-validation-status');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { AttachmentValidation } = require('../../modules/incident/domain/attachment-validation');
const {
  ReadsqlProductRepository
} = require('../../modules/incident/adapters/readsql-product-repository');
const { RpcRefundRepository } = require('../../modules/incident/adapters/rpc-refund-repository');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');

const ACCEPTED_EVENTS = [
  'topic/document-validation.validated:v1',
  'topic/document-validation.rejected:v1',
  'topic/document-validation.started:v1'
];

async function handler(
  { data, headers, context, invoke },
  {
    logger = globalLogger,
    productRepository = new ReadsqlProductRepository(context),
    refundRepository = new RpcRefundRepository(invoke),
    messageRepository = new RpcMessageRepository(invoke),
    parcelRepository = new RpcParcelRepository(invoke)
  } = {}
) {
  const { 'x-destination': event } = headers;

  if (!ACCEPTED_EVENTS.includes(event)) {
    logger.debug(`ignored event ${event}`, { context, event });

    return { updated: 0 };
  }

  const { id: validationId, status, outputPayload } = data;

  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const updateStatus = usecase({
      incidentRepository,
      productRepository,
      refundRepository,
      messageRepository,
      parcelRepository
    });
    const incident = await updateStatus.execute({
      validationId,
      status,
      payload: outputPayload
    });

    await trx.commit();

    updateStatus.notify(incident);

    return { updated: 1 };
  } catch (error) {
    await trx.rollback();

    if (error instanceof InvalidAttachmentValidationPayloadError) {
      logger.error(
        `validation ${validationId} has a wrong payload, to be fixed and replayed asap`,
        {
          context,
          error,
          id: validationId,
          payload: outputPayload
        }
      );
    } else if (error instanceof ResourceNotFoundError) {
      logger.warn(`validation ${validationId} does not match any incident`, {
        context,
        id: validationId
      });

      return { updated: 0 };
    }

    throw error;
  }
}

const meta = {
  description: 'On document-validation status updated, update related incident',
  requestSchema: schemaUtils.object('Request', {
    required: ['id', 'status'],
    properties: {
      id: schemaUtils.string('Document-validation id'),
      status: schemaUtils.string('New status just updated', {
        enum: Object.values(AttachmentValidation.STATUSES)
      }),
      // not used for the moment
      outputPayload: schemaUtils.object('Any output analyzed from attachments')
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      updated: schemaUtils.integer('Number of incidents updated')
    }
  })
};

module.exports = { handler, meta };
