const pick = require('lodash/pick');
const IncidentRequesterModel = require('../../../models/incident-requester');
const { createRequester } = require('../../domain/requester');

const REQUESTER_LIST_PAGE_SIZE = 50;

/**
 * @interface RequesterRepository
 * @property {Transaction} transaction
 */
class SqlRequesterRepository {
  /**
   * @param {Transaction} trx - if provided, ALL repo queries will be done in the same transaction
   */
  constructor(trx) {
    this.trx = trx;
  }

  /**
   * @param {Requester} requester
   * @returns {Promise<void>}
   */
  async create(requester) {
    if (requester.bankInfo) {
      // eslint-disable-next-line no-param-reassign
      requester.bankInfo = JSON.stringify(requester.bankInfo);
    }
    const dbGraph = requesterToDbGraph(requester);
    const createdRecord = await IncidentRequesterModel.query(this.trx).insertGraph(dbGraph);

    return createdRecord;
  }

  /**
   * Returns the fully hydrated requester
   *
   * @param {string} id
   * @returns {Promise<Requester | null>}
   */
  async findById(id) {
    const model = await IncidentRequesterModel.query(this.trx).findById(id);

    if (!model) return null;

    return createRequester(model);
  }

  /**
   * Update only top level properties of this requester model
   *
   * @param {Requester} requester
   * @returns {Promise<void>}
   */
  async update(requester) {
    await IncidentRequesterModel.query(this.trx)
      .findById(requester.id)
      .patch(requesterToModel(requester));
  }

  /**
   * This might move to a denormalized ES index later on
   *
   * @param {Object} filters
   * @param {string} filters.id
   * @param {Object} options
   * @param {number} options.offset
   * @param {number} options.limit
   * @returns {Promise<Requester[]>}
   */
  async query(filters, { offset = 0, limit = REQUESTER_LIST_PAGE_SIZE } = {}) {
    const query = IncidentRequesterModel.query(this.trx)
      .fullQuery(filters)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset);

    return (await query).map(createRequester);
  }
}

const ROOT_PROPERTIES = [
  'id',
  'firstName',
  'lastName',
  'email',
  'request',
  'language',
  'organizationName',
  'bankInfo'
];

function requesterToModel(requester) {
  return pick(requester, ROOT_PROPERTIES);
}

function requesterToDbGraph(requester) {
  return pick(requester, [...ROOT_PROPERTIES]);
}

module.exports = { SqlRequesterRepository };
