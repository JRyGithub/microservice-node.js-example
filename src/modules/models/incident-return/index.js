const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class IncidentReturnModel extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'incidentReturns';
  }

  static get relationMappings() {
    return {
      incident: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../incident`,
        join: {
          to: 'incidents.id',
          from: 'incidentReturns.incidentId'
        },
        filter: { 'incidents.type': 'CONSUMER_RETURN' }
      }
    };
  }
}

module.exports = IncidentReturnModel;
