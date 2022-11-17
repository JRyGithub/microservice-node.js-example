const { assert } = require('@devcubyn/core.errors');
const { TokensHostNotFoundError, TokenNotFoundError, TokenExpiredError } = require('../../errors');

class TrustpilotTokenStorage {
  /**
   * @param {Object} param
   * @param {TrustpilotTokenRepository} param.trustpilotTokenRepository
   * @param {CurrentDateHost} param.currentDateHost
   * @param {TransientLoggerFactory} param.loggerFactory
   */
  constructor({ trustpilotTokenRepository, currentDateHost, loggerFactory }) {
    this.trustpilotTokenRepository = trustpilotTokenRepository;
    this.currentDateHost = currentDateHost;
    /**
     * @private
     */
    this.logger = loggerFactory.create('TrustpilotTokenStorage');
  }

  async getAccessToken() {
    const tokensHost = await this.trustpilotTokenRepository.findTokensHost();
    assert(tokensHost, TokensHostNotFoundError);

    const { accessToken, accessTokenIssuedAt, accessTokenExpiresIn } = tokensHost;
    assert(
      accessToken && accessTokenIssuedAt && accessTokenExpiresIn,
      TokenNotFoundError,
      'ACCESS'
    );

    const expired = this.checkTokenExpired(accessTokenIssuedAt, accessTokenExpiresIn);

    if (expired) {
      this.logger.debug('Access token expired');
      await this.trustpilotTokenRepository.removeAccessToken();

      throw new TokenExpiredError('ACCESS');
    }

    return accessToken;
  }

  async getRefreshToken() {
    const tokensHost = await this.trustpilotTokenRepository.findTokensHost();
    assert(tokensHost, TokensHostNotFoundError, 'Tokens host');

    const { refreshToken, refreshTokenIssuedAt, refreshTokenExpiresIn } = tokensHost;
    assert(
      refreshToken && refreshTokenIssuedAt && refreshTokenExpiresIn,
      TokenNotFoundError,
      'Refresh token'
    );

    const expired = this.checkTokenExpired(refreshTokenIssuedAt, refreshTokenExpiresIn);

    if (expired) {
      this.logger.debug('Refresh token expired');
      await this.trustpilotTokenRepository.removeRefreshToken();

      throw new TokenExpiredError('REFRESH');
    }

    return refreshToken;
  }

  async setTokens({
    accessToken,
    accessTokenIssuedAt,
    accessTokenExpiresIn,
    refreshToken,
    refreshTokenIssuedAt,
    refreshTokenExpiresIn
  }) {
    await this.trustpilotTokenRepository.setTokensHost({
      accessToken,
      accessTokenIssuedAt,
      accessTokenExpiresIn,
      refreshToken,
      refreshTokenIssuedAt,
      refreshTokenExpiresIn
    });
    this.logger.debug('Tokens are set');
  }

  /**
   * @private
   */
  checkTokenExpired(issuedAt, expiresIn) {
    return issuedAt + expiresIn <= this.currentDateHost.get().getTime();
  }
}

module.exports = { TrustpilotTokenStorage };
