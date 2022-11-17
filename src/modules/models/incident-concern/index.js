const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class IncidentConcernModel extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'incidentConcerns';
  }

  static get relationMappings() {
    return {
      incident: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../incident`,
        join: {
          to: 'incidents.id',
          from: 'incidentConcerns.incidentId'
        }
      }
    };
  }
}

module.exports = IncidentConcernModel;
