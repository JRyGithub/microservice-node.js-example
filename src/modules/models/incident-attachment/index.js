const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class IncidentAttachmentModel extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'incidentAttachments';
  }

  static get relationMappings() {
    return {
      incident: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../incident`,
        join: {
          to: 'incidents.id',
          from: 'incidentAttachments.incidentId'
        }
      }
    };
  }
}

module.exports = IncidentAttachmentModel;
