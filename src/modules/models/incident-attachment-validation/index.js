const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class IncidentAttachmentValidationModel extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'incidentAttachmentValidations';
  }

  static get jsonAttributes() {
    return ['payload'];
  }

  static get relationMappings() {
    return {
      incident: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../incident`,
        join: {
          to: 'incidents.id',
          from: 'incidentAttachmentValidations.incidentId'
        }
      }
    };
  }
}

module.exports = IncidentAttachmentValidationModel;
