/* eslint-disable max-classes-per-file */
const { QueryBuilder } = require('objection');
const { ObjectionModel } = require('../../../drivers/mysql');

class FullQueryQueryBuilder extends QueryBuilder {
  fullQuery(filters) {
    if (filters.id) {
      this.where({ id: filters.id });
    }

    if (filters.fromDate) {
      this.where('createdAt', '>=', filters.fromDate);
    }

    if (filters.toDate) {
      this.where('createdAt', '<=', filters.toDate);
    }

    return this;
  }
}

class IncidentRequesterModel extends ObjectionModel {
  static get tableName() {
    return 'incidentRequesters';
  }

  static get relationMappings() {
    return {
      incident: {
        relation: this.HasManyRelation,
        modelClass: `${__dirname}/../incident`,
        join: {
          to: 'incidents.ownerId',
          from: 'incidentRequesters.id'
        },
        filter: { 'incidents.source': 'RECIPIENT' }
      }
    };
  }

  static get QueryBuilder() {
    return FullQueryQueryBuilder;
  }
}

module.exports = IncidentRequesterModel;
