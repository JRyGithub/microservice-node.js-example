const { ObjectionModel } = require('../../../drivers/mysql');

class TrustpilotTokenModel extends ObjectionModel {
  static get tableName() {
    return 'trustpilotTokens';
  }
}

module.exports = TrustpilotTokenModel;
