const lodash = require('lodash');
const schemaUtils = require('carotte-schema-utils');
const logger = require('../../drivers/logger');
const {
  incident: incidentSchema,
  requester: requesterSchema,
  sanitize
} = require('../../modules/models/incident/schemas');
const {
  SqlIncidentRepository
} = require('../../modules/incident/adapters/sql-incident-repository');
const { RpcFileRepository } = require('../../modules/incident/adapters/rpc-file-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { RpcProductRepository } = require('../../modules/incident/adapters/rpc-product-repository');
const {
  RpcParcelPicklistRepository
} = require('../../modules/incident/adapters/rpc-parcel-picklist-repository');
const {
  RpcScubStockInfoRepository
} = require('../../modules/incident/adapters/rpc-scub-stock-info-repository');
const { BaseIncident } = require('../../modules/incident/domain/incident/base');
const { INCIDENT_TYPES, INCIDENT_ENTITY_TYPES } = require('../../modules/incident/domain/incident');
const {
  IncidentAppliedResolutionService
} = require('../../modules/incident/services/incident-applied-resolution');
const { hydrateIncidentsUrls } = require('./hydrate-incident-urls');

const PERMISSION = 'incident.read';
const INCIDENT_LIST_PAGE_SIZE = 50;

async function handler(
  { data, context, invoke },
  {
    incidentRepository = new SqlIncidentRepository(),
    fileRepository = new RpcFileRepository(invoke),
    parcelRepository = new RpcParcelRepository(invoke),
    productRepository = new RpcProductRepository(invoke),
    parcelPicklistRepository = new RpcParcelPicklistRepository(invoke),
    scubStockInfoRepository = new RpcScubStockInfoRepository(invoke)
  } = {}
) {
  let { filters = {} } = data || {};
  const { limit = INCIDENT_LIST_PAGE_SIZE, offset = 0, includes } = data || {};

  const incidentAppliedResolutionService = new IncidentAppliedResolutionService({
    parcelRepository,
    productRepository,
    parcelPicklistRepository,
    scubStockInfoRepository
  });

  filters = addFiltersFromPermissions(filters, context);
  filters = sanitizeFilters(filters);

  let incidents = await incidentRepository.query(filters, {
    offset,
    limit
  });

  const incidentsCount = await incidentRepository.count(filters);

  await loadRelations(incidents, includes, invoke, incidentAppliedResolutionService, context);

  await hydrateIncidentsUrls(incidents, { fileRepository });

  // filter bankinfo
  incidents = incidents.map((item) => {
    // eslint-disable-next-line no-param-reassign
    item.requester = sanitize(item.requester, requesterSchema, ['bankInfo']);

    return item;
  });

  /**
   * TODO: update result & schema
   */
  return {
    items: incidents,
    count: incidentsCount
  };
}

/**
 *
 * @param {Object[]} incidents
 * @param {string[]} includes
 * @param {Function} invoke
 * @param {IncidentAppliedResolutionService} incidentAppliedResolutionService
 * @param {Object} context
 */
async function loadRelations(
  incidents,
  includes = [],
  invoke,
  incidentAppliedResolutionService,
  context
) {
  try {
    const incidentsOfParcelEntityType = incidents.filter(incidentParcelEntityTypePredicate);
    const incidentsOfProductEntityType = incidents.filter(incidentProductEntityTypePredicate);

    const parcelsPromise =
      includes.includes('entity') || includes.includes('parcel')
        ? invoke('parcel.list:v1', {
            filters: { id: incidentsOfParcelEntityType.map(({ entityId: id }) => id) },
            includes: ['parcel.admin']
          })
        : [];
    const shipmentsPromise = includes.includes('parcel.shipment')
      ? invoke('shipment.list:v1', {
          filters: { ids: incidentsOfParcelEntityType.map(({ entityId: id }) => id) }
        })
      : [];
    const productsPromise =
      includes.includes('entity') || includes.includes('product')
        ? invoke('product-catalog__product.list:v1', {
            filters: { id: incidentsOfProductEntityType.map(({ entityId: id }) => id) }
          })
        : [];

    const appliedResolutionResultsPromise = includes.includes('appliedResolutionResult')
      ? Promise.all(
          incidents.map(async (incident) =>
            incident.isRecipientSource()
              ? incidentAppliedResolutionService.resolve({ incident })
              : null
          )
        )
      : [];

    const [parcels, shipments, products, appliedResolutionResults] = await Promise.all([
      parcelsPromise,
      shipmentsPromise,
      productsPromise,
      appliedResolutionResultsPromise
    ]);

    incidentsOfParcelEntityType.forEach((incident, index) => {
      const appliedResolutionResult = appliedResolutionResults[index];

      if (appliedResolutionResult) {
        // eslint-disable-next-line no-param-reassign
        incident.appliedResolutionResult = {
          ...appliedResolutionResult,
          // eslint-disable-next-line no-undefined
          incident: undefined,
          scubIdToReshipQuantityMap: Object.fromEntries(
            appliedResolutionResult.scubIdToReshipQuantityMap.entries()
          )
        };
      }

      const foundParcel = parcels.find(({ id }) => incident.entityId === id.toString());

      if (!foundParcel) {
        return;
      }

      // eslint-disable-next-line no-param-reassign
      incident.entity = foundParcel;

      const foundShipment = shipments.find(({ id }) => id === foundParcel.id.toString());

      if (!foundShipment) {
        return;
      }

      // eslint-disable-next-line no-param-reassign
      incident.entity.shipment = foundShipment;
    });

    incidentsOfProductEntityType.forEach((incident) => {
      const foundProduct = products.find(({ id }) => incident.entityId === id.toString());

      if (!foundProduct) {
        return;
      }

      // eslint-disable-next-line no-param-reassign
      incident.entity = foundProduct;
    });
  } catch (error) {
    logger.error('Load relations without success', { error, context });
  }
}

/**
 * When SHIPPER, add ownerId to filters
 * When INCIDENT USER AGENT, no scoping
 *
 * @param {Object} filters
 * @param {Object} context
 * @returns {Object}
 */
function addFiltersFromPermissions(filters, context) {
  const { permissions = {} } = context;
  const rules = permissions[PERMISSION] || [];

  // only permission rule allowed
  if (rules.length && rules[0].ownerId) {
    return {
      ...filters,
      ownerId: rules[0].ownerId
    };
  }

  return filters;
}

/**
 * Pick only supported filters
 *
 * @param {Object} filters
 * @returns {Object}
 */
function sanitizeFilters(filters) {
  const sanitized = lodash.pick(
    filters,
    'id',
    'type',
    'status',
    'refundStatus',
    'isManuallyUpdated',
    'fromDate',
    'toDate',
    'parcelId'
  );

  if (filters.ownerId) {
    sanitized.ownerId = parseInt(filters.ownerId, 10);
    sanitized.relatedShipperId = parseInt(filters.ownerId, 10);
  }

  return sanitized;
}

const singleOrArray = (itemSchema) => ({
  anyOf: [itemSchema, { type: 'array', items: itemSchema }]
});

const meta = {
  description: 'List incidents by ownerId, status or refundId',
  permissions: [PERMISSION],
  retry: { max: 2 },
  requestSchema: schemaUtils.object('Request', {
    properties: {
      filters: schemaUtils.object('Filters', {
        properties: {
          id: schemaUtils.string('Id of the incident'),
          status: singleOrArray(
            schemaUtils.string('Status of the incident', {
              enum: Object.values(BaseIncident.STATUSES)
            })
          ),
          refundStatus: singleOrArray(
            schemaUtils.string('Refund status of the incident', {
              enum: Object.values(BaseIncident.REFUND_STATUSES)
            })
          ),
          type: singleOrArray(
            schemaUtils.string('Refund status of the incident', {
              enum: Object.values(INCIDENT_TYPES)
            })
          ),
          ownerId: schemaUtils.number('Owner of the incident')
        }
      }),
      limit: schemaUtils.number('Limit', {
        default: INCIDENT_LIST_PAGE_SIZE
      }),
      offset: schemaUtils.number('Offset', {
        default: 0
      }),
      includes: schemaUtils.array('Includes')
    }
  }),
  responseSchema: schemaUtils.object('Response', {
    properties: {
      items: schemaUtils.array('Array of incidents', { items: incidentSchema }),
      count: schemaUtils.number('Count of incidents')
    }
  })
};

function incidentParcelEntityTypePredicate(incident) {
  return incident.entityType === INCIDENT_ENTITY_TYPES.PARCEL;
}

function incidentProductEntityTypePredicate(incident) {
  return incident.entityType === INCIDENT_ENTITY_TYPES.PRODUCT;
}

module.exports = { handler, meta };
