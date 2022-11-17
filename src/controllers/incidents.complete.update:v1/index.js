const { transaction } = require('objection');
const schemaUtils = require('carotte-schema-utils');
const { assert, BadRequestError } = require('@devcubyn/core.errors');
const IncidentModel = require('../../modules/models/incident');
const {
  forceCompleteIncidentUsecase
} = require('../../modules/incident/usecases/force-complete-incident');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { RpcRefundRepository } = require('../../modules/incident/adapters/rpc-refund-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { RpcProductRepository } = require('../../modules/incident/adapters/rpc-product-repository');
const {
  RpcParcelPicklistRepository
} = require('../../modules/incident/adapters/rpc-parcel-picklist-repository');
const {
  RpcScubStockInfoRepository
} = require('../../modules/incident/adapters/rpc-scub-stock-info-repository');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');
const {
  IncidentAppliedResolutionService
} = require('../../modules/incident/services/incident-applied-resolution');

const PERMISSION = 'incident.status.update';

async function handler(
  { data: { params = {}, body = {} }, invoke, context },
  {
    refundRepository = new RpcRefundRepository(invoke),
    parcelRepository = new RpcParcelRepository(invoke),
    productRepository = new RpcProductRepository(invoke),
    parcelPicklistRepository = new RpcParcelPicklistRepository(invoke),
    scubStockInfoRepository = new RpcScubStockInfoRepository(invoke),
    messageRepository = new RpcMessageRepository(invoke)
  } = {}
) {
  assert(context.application.id, BadRequestError, 'Missing context.application.id');
  const applicationId = context.application.id;
  const payload = { id: params.id, ...body, applicationId };

  const incidentAppliedResolutionService = new IncidentAppliedResolutionService({
    parcelRepository,
    productRepository,
    parcelPicklistRepository,
    scubStockInfoRepository
  });

  let incident;
  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const updateIncidentStatus = forceCompleteIncidentUsecase({
      incidentRepository,
      refundRepository,
      parcelRepository,
      messageRepository,
      productRepository,
      incidentAppliedResolutionService
    });
    incident = await updateIncidentStatus.execute(payload);
    await trx.commit();
    await updateIncidentStatus.notify(incident);

    return { body: { updated: 1 } };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const meta = {
  description:
    'Resolve or reject an incident and prevent any subsequent computation on its refund status',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    required: ['params', 'body'],
    properties: {
      params: schemaUtils.object('Params', {
        properties: {
          id: schemaUtils.string('Incident id')
        }
      }),
      body: schemaUtils.object('Body', {
        status: schemaUtils.string('Incident status', { enum: ['RESOLVED', 'REJECTED'] }),
        rejectedReason: schemaUtils.object('rejection reason, mandatory when status = REJECTED', {
          properties: {
            msg: schemaUtils.string('message, if it is not related to any of rejected reason keys'),
            key: schemaUtils.string('key of rejected reason'),
            data: schemaUtils.array('array of strings that we use to concat', {
              items: schemaUtils.string('additional info for rejected reason')
            })
          }
        }),
        shippingFeesAmount: schemaUtils.number(
          'Shipping fees refund %, ignored if status = REJECTED'
        ),
        merchandiseAmount: schemaUtils.number(
          ' Value of merchandise refund for the incident, ignored if status = REJECTED'
        ),
        taxValue: schemaUtils.number(
          ' Tax value of merchandise refund for the incident, ignored if status = REJECTED'
        )
      })
    }
  }),
  responseSchema: schemaUtils.object('Request', {
    properties: {
      body: schemaUtils.object('Response', {
        properties: {
          updated: schemaUtils.number('Number of incidents updated')
        }
      })
    }
  })
};

module.exports = { handler, meta };
