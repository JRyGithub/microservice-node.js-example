const pick = require('lodash/pick');
const IncidentModel = require('../../../models/incident');
const IncidentAttachmentValidationModel = require('../../../models/incident-attachment-validation');
const IncidentConcernModel = require('../../../models/incident-concern');
const { createIncident } = require('../../domain/incident');
const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');

/**
 * @interface IncidentRepository
 * @property {Transaction} transaction
 */
class SqlIncidentRepository {
  /**
   * @param {Transaction} trx - if provided, ALL repo queries will be done in the same transaction
   */
  constructor(trx) {
    this.trx = trx;
  }

  // eslint-disable-next-line class-methods-use-this
  jsonToString(json) {
    if (typeof json === 'string') return json;

    return JSON.stringify(json);
  }

  requester(requester) {
    if (!requester) return requester;
    if (!requester.bankInfo) return requester;

    // eslint-disable-next-line no-param-reassign
    requester.bankInfo = this.jsonToString(requester.bankInfo);

    return requester;
  }

  /**
   * @param {Incident} incident
   * @returns {Promise<void>}
   */
  async create(incident) {
    // eslint-disable-next-line no-param-reassign
    incident.requester = this.requester(incident.requester);
    const dbGraph = incidentToDbGraph(incident);
    await IncidentModel.query(this.trx).insertGraph(dbGraph);
  }

  /**
   * Returns the fully hydrated incident
   *
   * @param {string} id
   * @returns {Promise<Incident | null>}
   */
  async findById(id) {
    const model = await IncidentModel.query(this.trx).defaultEager().findById(id);

    if (!model) return null;

    return createIncident(model);
  }

  /**
   * @param {string} parcelId
   * @returns {Promise<Incident | void>}
   */
  async findByParcelId(parcelId) {
    const model = await IncidentModel.query(this.trx)
      .defaultEager()
      .whereParcelId(parcelId)
      .first();

    if (!model) return null;

    return createIncident(model);
  }

  /**
   * @param {string} parcelId
   * @param {string} type
   * @returns {Promise<Incident | void>}
   */
  async findAllByParcelId(parcelId) {
    const model = await IncidentModel.query(this.trx).defaultEager().whereParcelId(parcelId);

    if (!model) return null;
    if (!model.length) return null;

    return model.map((incident) => createIncident(incident));
  }

  /**
   * Returns the fully hydrated incident
   *
   * @param {string} id - id of refund xml record
   * @returns {Promise<Incident | null>}
   */
  async findByXMLEndToEndId(id) {
    const model = await IncidentModel.query(this.trx).where({ refundSentXMLEndToEndId: id });

    if (!model) return null;

    return createIncident(model);
  }

  /**
   * @param {string} validationId - id of document-validation foreign resource
   * @returns {Promise<Incident>}
   */
  async findByAttachmentValidationId(validationId) {
    const validation = await IncidentAttachmentValidationModel.query(this.trx)
      .select('incidentId')
      .where({ validationId })
      .limit(1)
      .first();

    if (!validation) return null;

    return this.findById(validation.incidentId);
  }

  /**
   * @param {BaseIncident.STATUSES} status
   * @returns {Promise<Incident[] | void>}
   */
  async findReturnsByStatus(status) {
    const model = await IncidentModel.query(this.trx)
      .eager('[returns]')
      .where({ type: INCIDENT_TYPES.CONSUMER_RETURN })
      .where({ status });

    if (!model) return null;
    if (!model.length) return null;

    return model.map((incident) => createIncident(incident));
  }

  /**
   * Update all properties of this attachment validation
   *
   * @param {AttachmentValidation} attachmentValidation
   * @returns {Promise<void>}
   */
  async updateAttachmentValidation(attachmentValidation) {
    await IncidentAttachmentValidationModel.query(this.trx)
      .findById(attachmentValidation.id)
      .patch(attachmentValidation);
  }

  /**
   * Update all properties of those concerns
   *
   * @param {Concern[]} concerns
   * @returns {Promise<void>}
   */
  async updateConcerns(concerns) {
    const updating = concerns.map(({ id, ...concern }) =>
      IncidentConcernModel.query(this.trx).findById(id).patch(concern)
    );

    return Promise.all(updating);
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<Concern[]>}
   */
  async findConcernsById(ids) {
    return IncidentConcernModel.query(this.trx).whereIn('id', ids);
  }

  /**
   * Update list of incidents
   *
   * @param {Array<Incident>} incidents
   * @returns {Promise<number[]>}
   */
  async bulkupdate(incidents) {
    const updating = incidents.map((incident) => {
      return IncidentModel.query(this.trx).findById(incident.id).patch(incidentToModel(incident));
    });

    return Promise.all(updating);
  }

  /**
   * Update only top level properties of this incident model
   *
   * @param {Incident} incident
   * @returns {Promise<void>}
   */
  async update(incident) {
    await IncidentModel.query(this.trx).findById(incident.id).patch(incidentToModel(incident));
  }

  async lastRefundSent(filters) {
    const model = await IncidentModel.query(this.trx)
      .fullQuery(filters)
      .orderBy('refundSentToHeadOfFinanceAt', 'desc')
      .first();

    return createIncident(model);
  }

  /**
   * This might move to a denormalized ES index later on
   *
   * @param {Object} filters
   * @param {string} filters.id
   * @param {number} filters.ownerId
   * @param {string|string[]} filters.type
   * @param {string|string[]} filters.status
   * @param {string|string[]} filters.refundStatus
   * @param {Object} options
   * @param {number} options.offset
   * @param {number} options.limit
   * @returns {Promise<Incident[]>}
   */
  async query(
    filters,
    {
      offset = 0,
      limit = 0,
      includes = ['attachments', 'concerns', 'attachmentValidations', 'requester', 'returns']
    } = {}
  ) {
    let query = IncidentModel.query(this.trx)
      .fullQuery(filters)
      // everything ftm
      .eager(`[${includes.join(',')}]`)
      // @FIXME that one should be added to compound index as well
      .orderBy('createdAt', 'desc')
      .offset(offset);

    if (limit) {
      query = query.limit(limit);
    }

    return (await query).map(createIncident);
  }

  /**
   * @param {Object} filters
   * @param {string} filters.id
   * @param {number} filters.ownerId
   * @param {string|string[]} filters.type
   * @param {string|string[]} filters.status
   * @param {string|string[]} filters.refundStatus
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    const [{ count } = { count: 0 }] = await IncidentModel.query(this.trx)
      .fullQuery(filters)
      .count('id as count');

    return count;
  }
}

const ROOT_PROPERTIES = [
  'id',
  'type',
  'status',
  'refundId',
  'refundStatus',
  'origin',
  'originId',
  'ownerId',
  'entityId',
  'entityType',
  'isManuallyUpdated',
  'rejectedReason',
  'merchandiseValue',
  'taxValue',
  'shippingFeesAmount',
  'source',
  'resolutionTypeSelected',
  'resolutionTypeApplied',
  'decidedToRefundAt',
  'refundSentToHeadOfFinanceAt',
  'refundSentXMLEndToEndId',
  'relatedShipperId',
  'reshipParcelId'
];

function incidentToModel(incident) {
  return pick(incident, ROOT_PROPERTIES);
}

function incidentToDbGraph(incident) {
  return pick(incident, [
    ...ROOT_PROPERTIES,
    'attachments',
    'concerns',
    'attachmentValidations',
    'requester',
    'returns'
  ]);
}

module.exports = { SqlIncidentRepository };
