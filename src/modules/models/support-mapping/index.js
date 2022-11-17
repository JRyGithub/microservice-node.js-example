const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class SupportMapping extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'supportMappings';
  }

  static get relationMappings() {
    return {
      supportTypes: {
        relation: this.BelongsToOneRelation,
        modelClass: `${__dirname}/../entity-type`,
        join: {
          to: 'supportTypes.id',
          from: 'supportMappings.typeId'
        }
      }
    };
  }
}

module.exports = SupportMapping;
