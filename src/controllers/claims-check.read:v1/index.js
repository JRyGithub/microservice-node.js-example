const { assert, BadRequestError } = require('@devcubyn/core.errors');
const schemaUtils = require('carotte-schema-utils');
// USECASES
const { transaction } = require('objection');
const {
  CheckAllRecipientCreationRulesUsecase
} = require('../../modules/incident/usecases/check-all-recipient-creation-rules');
// ENGINES
const {
  ProductToScubResolveEngine
} = require('../../modules/incident/engines/product-to-scub-resolve');
const { CreationRulesEngine } = require('../../modules/incident/engines/creation-rules');
// RPC
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { RpcScubRepository } = require('../../modules/incident/adapters/rpc-scub-repository');
const {
  RpcProductScubMappingRepository
} = require('../../modules/incident/adapters/rpc-product-scub-mapping-repository');
const {
  RpcShipmentRepository
} = require('../../modules/incident/adapters/rpc-shipment-repository');
const IncidentModel = require('../../modules/models/incident');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { SqlDenyLogRepository } = require('../../modules/incident/adapters/sql-deny-log-repository');

const PERMISSION = 'incident.create';

async function handler(
  { data: { params = {}, query = {} }, invoke },
  {
    parcelRepository = new RpcParcelRepository(invoke),
    scubRepository = new RpcScubRepository(invoke),
    shipmentRepository = new RpcShipmentRepository(invoke),
    productScubMappingRepository = new RpcProductScubMappingRepository(invoke),
    productToScubResolveEngine = new ProductToScubResolveEngine({
      scubRepository,
      productScubMappingRepository
    }),
    creationRulesEngine = new CreationRulesEngine()
  } = {}
) {
  const { id: parcelId } = params;
  const { incidentType = null } = query;

  assert(parcelId, BadRequestError, 'Parcel id should be provided');
  const trx = await transaction.start(IncidentModel.knex());

  try {
    const incidentRepository = new SqlIncidentRepository(trx);
    const denyLogRepository = new SqlDenyLogRepository(trx);
    const checkRules = new CheckAllRecipientCreationRulesUsecase({
      parcelRepository,
      incidentRepository,
      shipmentRepository,
      productToScubResolveEngine,
      denyLogRepository,
      creationRulesEngine
    });

    const { incidentTypeToCheckCreationRulesResultMap: rules } = await checkRules.execute({
      parcelId,
      incidentType
    });

    await trx.commit();

    return {
      body: {
        rules: Object.fromEntries(rules)
      }
    };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const meta = {
  description: 'Check recipient rules',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    properties: {
      params: schemaUtils.object('Params', {
        properties: {
          id: schemaUtils.string('Parcel id that we want to check for rules')
        },
        required: ['id']
      })
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      body: schemaUtils.object('Rules that are allowed for parcel', {
        properties: {
          rules: schemaUtils.object('Rules that are allowed for parcel', {
            allowed: schemaUtils.boolean('Allowed or not'),
            error: schemaUtils.object('Error type that has this rule', {
              properties: {
                reason: schemaUtils
              }
            })
          })
        }
      })
    }
  })
};

module.exports = { handler, meta };
