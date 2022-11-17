/* eslint-disable no-param-reassign */
/* eslint-disable complexity */
/* eslint-disable max-classes-per-file */
const { QueryBuilder } = require('objection');
const { ObjectionModel } = require('../../../drivers/mysql');
const { BaseIncident } = require('../../incident/domain/incident/base');
const { INCIDENT_TYPES, INCIDENT_ENTITY_TYPES } = require('../../incident/domain/incident');

class FullQueryQueryBuilder extends QueryBuilder {
  fullQuery(filters) {
    // those to make sure we're using our compound indices
    // (type, status, refundStatus, isManuallyUpdated) => for agents
    // (ownerId, type, status, refundStatus) => for shippers
    filters.type = filters.type || Object.values(INCIDENT_TYPES);
    filters.status = filters.status || Object.values(BaseIncident.STATUSES);

    this.whereIn('type', Array.isArray(filters.type) ? filters.type : [filters.type]);
    this.whereIn('status', Array.isArray(filters.status) ? filters.status : [filters.status]);
    if (filters.refundStatus) {
      this.whereIn(
        'refundStatus',
        Array.isArray(filters.refundStatus) ? filters.refundStatus : [filters.refundStatus]
      );
    }

    if (filters.isManuallyUpdated) {
      this.where({ isManuallyUpdated: filters.isManuallyUpdated });
    }

    if (filters.ownerId) {
      this.where({ ownerId: filters.ownerId }).orWhere({ relatedShipperId: filters.ownerId });
    }

    if (filters.id) {
      this.where({ id: filters.id });
    }

    if (filters.fromDate) {
      this.where('createdAt', '>=', filters.fromDate);
    }

    if (filters.toDate) {
      this.where('createdAt', '<=', filters.toDate);
    }

    if (filters.source) {
      this.where({ source: filters.source });
    }

    if (filters.resolutionTypeApplied) {
      this.where({ resolutionTypeApplied: filters.resolutionTypeApplied });
    }

    if (filters.merchandiseValueIsSet) {
      this.whereNotNull('merchandiseValue');
    }

    if (filters.refundNotGenerated) {
      this.whereNull('refundSentToHeadOfFinanceAt');
    }

    if (filters.refundSentXMLEndToEndId) {
      this.whereIn(
        'refundSentXMLEndToEndId',
        Array.isArray(filters.refundSentXMLEndToEndId)
          ? filters.refundSentXMLEndToEndId
          : [filters.refundSentXMLEndToEndId]
      );
    }

    if (filters.parcelId) {
      this.where({ entityType: INCIDENT_ENTITY_TYPES.PARCEL, entityId: filters.parcelId });
    }

    return this;
  }

  whereParcelId(parcelId) {
    this.where({ entityType: INCIDENT_ENTITY_TYPES.PARCEL, entityId: parcelId });

    return this;
  }

  defaultEager() {
    this.eager(
      `[${['attachments', 'concerns', 'attachmentValidations', 'requester', 'returns'].join(',')}]`
    );

    return this;
  }
}

class IncidentModel extends ObjectionModel {
  static get tableName() {
    return 'incidents';
  }

  static get QueryBuilder() {
    return FullQueryQueryBuilder;
  }

  $parseDatabaseJson(json) {
    const values = super.$parseDatabaseJson(json);

    // decimal(x, z) is kept as string using
    if (values.merchandiseValue) {
      values.merchandiseValue = Number(values.merchandiseValue);
    }

    return values;
  }

  static get relationMappings() {
    return {
      attachments: {
        relation: this.HasManyRelation,
        modelClass: `${__dirname}/../incident-attachment`,
        join: {
          to: 'incidents.id',
          from: 'incidentAttachments.incidentId'
        }
      },
      concerns: {
        relation: this.HasManyRelation,
        modelClass: `${__dirname}/../incident-concern`,
        join: {
          to: 'incidents.id',
          from: 'incidentConcerns.incidentId'
        }
      },
      attachmentValidations: {
        relation: this.HasManyRelation,
        modelClass: `${__dirname}/../incident-attachment-validation`,
        join: {
          to: 'incidents.id',
          from: 'incidentAttachmentValidations.incidentId'
        }
      },
      requester: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../incident-requester`,
        join: {
          to: 'incidents.ownerId',
          from: 'incidentRequesters.id'
        }
      },
      returns: {
        relation: this.HasOneRelation,
        modelClass: `${__dirname}/../incident-return`,
        join: {
          to: 'incidents.id',
          from: 'incidentReturns.incidentId'
        }
      }
    };
  }
}

module.exports = IncidentModel;
