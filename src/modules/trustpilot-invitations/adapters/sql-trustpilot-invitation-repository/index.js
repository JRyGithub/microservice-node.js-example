const pick = require('lodash/pick');
const TrustpilotInvitationModel = require('../../../models/trustpilot-invitation');
const { createTrustpilotInvitation } = require('../../domain/trustpilot-invitation');

/**
 * @interface TrustpilotInvitationRepository
 */
class SqlTrustpilotInvitationRepository {
  /**
   * @param {import("knex").Transaction} trx
   * @param {CurrentDateHost} currentDateHost
   * @param {EnvHost} envHost
   */
  constructor(trx, currentDateHost, envHost) {
    /**
     * @private
     */
    this.trx = trx;
    /**
     * @private
     */
    this.currentDateHost = currentDateHost;
    this.envHost = envHost;
  }

  /**
   * @param {TrustpilotInvitation} tpInvite
   * @returns {Promise<void>}
   */
  async create(tpInvite) {
    await TrustpilotInvitationModel.query(this.trx).insert(tpInvite);
  }

  /**
   * @param {number | void} limit
   * @returns {Promise<string[]>}
   */
  async findAllProcessingIds(limit = 0) {
    const dateToSearchOlderThen = this.createDateToSearchOlderThen();
    const query = TrustpilotInvitationModel.query(this.trx)
      .where((queryB) => queryB.whereTodoStatus().whereOlderThen(dateToSearchOlderThen))
      .orWhere((queryB) =>
        queryB
          .whereFailedStatus()
          .whereRetriedLessThen(this.envHost.get().TRUSTPILOT_FAILED_MAX_RETRIES)
      )
      .select('id');

    if (limit) {
      query.limit(limit);
    }

    const tiIds = await query;

    return tiIds.map(({ id }) => id);
  }

  /**
   * @param {string[]} ids
   * @returns {Promise<TrustpilotInvitation[]>}
   */
  async findManyByIds(ids) {
    const tis = await TrustpilotInvitationModel.query(this.trx).findByIds(ids);

    return tis.map(modelToTrustpilotInvitation);
  }

  /**
   * @returns {TrustpilotInvitation[]}
   */
  async findAllDelayedTodos() {
    const dateToSearchOlderThen = this.createDateToSearchOlderThen();
    const todos = await TrustpilotInvitationModel.query(this.trx)
      .whereTodoStatus()
      .whereOlderThen(dateToSearchOlderThen);

    return todos.map(modelToTrustpilotInvitation);
  }

  /**
   * @returns {TrustpilotInvitation[]}
   */
  async findAllFailed() {
    const todos = await TrustpilotInvitationModel.query(this.trx)
      .whereFailedStatus()
      .whereRetriedLessThen(this.envHost.get().TRUSTPILOT_FAILED_MAX_RETRIES);

    return todos.map(modelToTrustpilotInvitation);
  }

  /**
   * @param {TrustpilotInvitation[]} tis
   *
   * @returns {void}
   */
  async transitManyToDone(tis) {
    await TrustpilotInvitationModel.query(this.trx)
      .findByIds(tis.map(({ id }) => id))
      .patch(trustpilotInvitationToModel({ status: TrustpilotInvitationModel.STATUSES.DONE }));
  }

  /**
   * @param {TrustpilotInvitation} tpInvite
   * @param {string | void} reason
   *
   * @returns {void}
   */
  async transitOneToCancelled(tpInvite, reason) {
    await TrustpilotInvitationModel.query(this.trx)
      .findById(tpInvite.id)
      .patch(
        trustpilotInvitationToModel({
          status: TrustpilotInvitationModel.STATUSES.CANCELLED,
          reason
        })
      );
  }

  /**
   * @param {TrustpilotInvitation} tpInvite
   * @param {Error | void} error
   * @param {keyof TrustpilotInvitationModel.REASONS | void} reason
   *
   * @returns {void}
   */
  async transitOneToFailed(
    tpInvite,
    error,
    reason = TrustpilotInvitationModel.REASONS.ERROR_ON_SEND
  ) {
    await TrustpilotInvitationModel.query(this.trx)
      .findById(tpInvite.id)
      .patch(
        trustpilotInvitationToModel({
          status: TrustpilotInvitationModel.STATUSES.FAILED,
          reason,
          retriesCount: TrustpilotInvitationModel.knex().raw('retriesCount + 1'),
          error
        })
      );
  }

  /**
   * @protected
   * @returns {Date}
   */
  createDateToSearchOlderThen() {
    const currentDate = this.currentDateHost.get();

    return new Date(currentDate.getTime() - this.envHost.get().TRUSTPILOT_TODO_DELAY);
  }
}

const ROOT_PROPERTIES = [
  'id',
  'firstName',
  'lastName',
  'email',
  'entityType',
  'entityId',
  'status',
  'reason',
  'error',
  'retriesCount'
];

function modelToTrustpilotInvitation(model) {
  return createTrustpilotInvitation(model);
}

// eslint-disable-next-line no-unused-vars
function trustpilotInvitationToModel(tpInvite) {
  return {
    ...pick(tpInvite, ROOT_PROPERTIES),
    error: tpInvite.error ? errorToPlainObject(tpInvite.error) : tpInvite.error
  };
}

function errorToPlainObject(error) {
  return JSON.stringify(error, Object.getOwnPropertyNames(error));
}

module.exports = { SqlTrustpilotInvitationRepository };
