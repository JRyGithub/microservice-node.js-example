const guid = require('objection-guid')();
const { ObjectionModel } = require('../../../drivers/mysql');

class SupportType extends guid(ObjectionModel) {
  static get useLimitInFirst() {
    return true;
  }

  static get tableName() {
    return 'entityTypes';
  }
}

module.exports = SupportType;
