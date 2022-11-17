/* eslint-disable max-classes-per-file */
const { QueryBuilder } = require('objection');
const { ObjectionModel } = require('../../../drivers/mysql');
const {
  TrustpilotInvitation
} = require('../../trustpilot-invitations/domain/trustpilot-invitation/abstract');

class TrustpilotInvitationQueryBuilder extends QueryBuilder {
  whereTodoStatus() {
    this.where({ status: TrustpilotInvitation.STATUSES.TO_DO });

    return this;
  }

  whereFailedStatus() {
    this.where({ status: TrustpilotInvitation.STATUSES.FAILED });

    return this;
  }

  whereOlderThen(date) {
    this.where('createdAt', '<=', date);

    return this;
  }

  whereRetriedLessThen(count) {
    this.where('retriesCount', '<', count);

    return this;
  }
}

class TrustpilotInvitationModel extends ObjectionModel {
  static get tableName() {
    return 'trustpilotInvitations';
  }

  static get QueryBuilder() {
    return TrustpilotInvitationQueryBuilder;
  }

  static get STATUSES() {
    return TrustpilotInvitation.STATUSES;
  }

  static get REASONS() {
    return TrustpilotInvitation.REASONS;
  }

  static get ENTITY_TYPES() {
    return TrustpilotInvitation.ENTITY_TYPES;
  }
}

module.exports = TrustpilotInvitationModel;
