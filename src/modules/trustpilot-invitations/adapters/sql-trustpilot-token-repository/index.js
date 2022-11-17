const TrustpilotTokenModel = require('../../../models/trustpilot-token');

/**
 * TODO: make
 * @interface TrustpilotTokenRepository
 */
class SqlTrustpilotTokenRepository {
  constructor(trx, tokensHostId) {
    this.trx = trx;
    this.tokensHostId = tokensHostId;
  }

  /**
   * @returns {tokensHost | void}
   */
  async findTokensHost() {
    const model = await TrustpilotTokenModel.query().findById(this.tokensHostId).first();

    if (!model) {
      return model;
    }

    return modelToTokensHost(model);
  }

  /**
   * @param {tokensHost} tokensHost
   */
  async setTokensHost(tokensHost) {
    await TrustpilotTokenModel.query()
      .findById(this.tokensHostId)
      .patch(tokensHostToModel(tokensHost));
  }

  async removeAccessToken() {
    await TrustpilotTokenModel.query().findById(this.tokensHostId).patch({
      accessToken: '',
      accessTokenIssuedAt: '',
      accessTokenExpiresIn: ''
    });
  }

  async removeRefreshToken() {
    await TrustpilotTokenModel.query().findById(this.tokensHostId).patch({
      refreshToken: '',
      refreshTokenIssuedAt: '',
      refreshTokenExpiresIn: ''
    });
  }
}

function modelToTokensHost(model) {
  return {
    accessToken: model.accessToken,
    accessTokenIssuedAt: stringToNumber(model.accessTokenIssuedAt),
    accessTokenExpiresIn: stringToNumber(model.accessTokenExpiresIn),
    refreshToken: model.refreshToken,
    refreshTokenIssuedAt: stringToNumber(model.refreshTokenIssuedAt),
    refreshTokenExpiresIn: stringToNumber(model.refreshTokenExpiresIn)
  };
}

function tokensHostToModel(tokensHost) {
  return {
    accessToken: tokensHost.accessToken,
    accessTokenIssuedAt: numberToString(tokensHost.accessTokenIssuedAt),
    accessTokenExpiresIn: numberToString(tokensHost.accessTokenExpiresIn),
    refreshToken: tokensHost.refreshToken,
    refreshTokenIssuedAt: numberToString(tokensHost.refreshTokenIssuedAt),
    refreshTokenExpiresIn: numberToString(tokensHost.refreshTokenExpiresIn)
  };
}

function numberToString(number) {
  return typeof number === 'number' ? number.toString() : '';
}

function stringToNumber(string) {
  return typeof string === 'string' ? Number(string) : 0;
}

/**
 * @typedef tokensHost
 * @property {string | void} accessToken
 * @property {number | void} accessTokenIssuedAt
 * @property {number | void} accessTokenExpiresIn
 * @property {string | void} refreshToken
 * @property {number | void} refreshTokenIssuedAt
 * @property {number | void} refreshTokenExpiresIn
 */

module.exports = { SqlTrustpilotTokenRepository };
