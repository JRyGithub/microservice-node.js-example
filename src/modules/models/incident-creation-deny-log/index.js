const { ObjectionModel } = require('../../../drivers/mysql');

class IncidentCreationDenyLogModel extends ObjectionModel {
  static get tableName() {
    return 'incidentCreationDenyLog';
  }
}

module.exports = IncidentCreationDenyLogModel;
