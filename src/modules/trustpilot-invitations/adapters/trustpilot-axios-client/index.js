const { URLSearchParams } = require('url');
const { TokensHostNotFoundError, TokenNotFoundError, TokenExpiredError } = require('../../errors');

class TrustpilotAxiosClient {
  /**
   * @param {Object} param
   * @param {TrustpilotTokenStorage} param.trustpilotTokenStorage
   * @param {typeof import('axios').default} param.axios
   * @param {EnvHost} param.envHost
   * @param {TransientLoggerFactory} loggerFactory
   */
  constructor({ trustpilotTokenStorage, axios, envHost, loggerFactory }) {
    this.trustpilotTokenStorage = trustpilotTokenStorage;
    this.axios = axios;
    this.envHost = envHost;
    /**
     * @private
     */
    this.logger = loggerFactory.create('TrustpilotAxiosClient');
  }

  /**
   *
   * @param {string} url
   * @param {any | void} data
   * @param {import('axios').AxiosRequestConfig | void} config
   *
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async post(url, data, config = {}) {
    return this.retryOnTokenExpiration(async () => {
      const accessToken = await this.trustpilotTokenStorage.getAccessToken();

      return this.axios.post(url, data, {
        baseURL: this.envHost.get().TRUSTPILOT_API_BASE_URL,
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
    });
  }

  /**
   *
   * @param {string} url
   * @param {import('axios').AxiosRequestConfig | void} config
   *
   * @returns {Promise<import('axios').AxiosResponse>}
   */
  async get(url, config = {}) {
    return this.retryOnTokenExpiration(async () => {
      const accessToken = await this.trustpilotTokenStorage.getAccessToken();

      return this.axios.get(url, {
        baseURL: this.envHost.get().TRUSTPILOT_API_BASE_URL,
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
    });
  }

  /**
   * @private
   */
  async retrieveTokens() {
    const authHeader = Buffer.from(
      `${this.envHost.get().TRUSTPILOT_API_KEY}:${this.envHost.get().TRUSTPILOT_API_SECRET}`
    ).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'password',
      username: this.envHost.get().TRUSTPILOT_USERNAME,
      password: this.envHost.get().TRUSTPILOT_PASSWORD
    });

    const response = await this.axios.post(
      '/v1/oauth/oauth-business-users-for-applications/accesstoken',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader
        },
        baseURL: this.envHost.get().TRUSTPILOT_API_BASE_URL
      }
    );

    const accessToken = response.data.access_token;
    const accessTokenExpiresIn = parseInt(response.data.expires_in, 10);
    const accessTokenIssuedAt = parseInt(response.data.issued_at, 10);
    const refreshToken = response.data.refresh_token;
    const refreshTokenExpiresIn = parseInt(response.data.refresh_token_expires_in, 10);
    const refreshTokenIssuedAt = parseInt(response.data.refresh_token_issued_at, 10);

    await this.trustpilotTokenStorage.setTokens({
      accessToken,
      accessTokenExpiresIn,
      accessTokenIssuedAt,
      refreshToken,
      refreshTokenExpiresIn,
      refreshTokenIssuedAt
    });
  }

  /**
   * @private
   */
  async refreshTokens() {
    const currentRefreshToken = await this.trustpilotTokenStorage.getRefreshToken();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.envHost.get().TRUSTPILOT_USERNAME,
      client_secret: this.envHost.get().TRUSTPILOT_PASSWORD,
      refresh_token: currentRefreshToken
    });

    const response = await this.axios.post(
      '/v1/oauth/oauth-business-users-for-applications/refresh',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        baseURL: this.envHost.get().TRUSTPILOT_API_BASE_URL
      }
    );

    const accessToken = response.data.access_token;
    const accessTokenExpiresIn = parseInt(response.data.expires_in, 10);
    const accessTokenIssuedAt = parseInt(response.data.issued_at, 10);
    const refreshToken = response.data.refresh_token;
    const refreshTokenExpiresIn = parseInt(response.data.refresh_token_expires_in, 10);
    const refreshTokenIssuedAt = parseInt(response.data.refresh_token_issued_at, 10);

    await this.trustpilotTokenStorage.setTokens({
      accessToken,
      accessTokenExpiresIn,
      accessTokenIssuedAt,
      refreshToken,
      refreshTokenExpiresIn,
      refreshTokenIssuedAt
    });
  }

  /**
   * @private
   *
   * @param {() => Promise<import('axios').AxiosResponse>} action
   */
  async retryOnTokenExpiration(action) {
    try {
      return await action();
    } catch (originalError) {
      if (
        !this.isAxiosUnauthorizedError(originalError) &&
        !(originalError instanceof TokensHostNotFoundError) &&
        !(originalError instanceof TokenNotFoundError) &&
        !(originalError instanceof TokenExpiredError)
      ) {
        throw originalError;
      }

      this.logger.debug('Failed to execute request');

      try {
        this.logger.debug('Trying to refresh tokens');
        await this.refreshTokens();
        this.logger.debug('Tokens refreshed successfully');
      } catch (error) {
        this.logger.debug('Trying to retrieve tokens');
        await this.retrieveTokens();
        this.logger.debug('Tokens retrieved successfully');
      }

      return action();
    }
  }

  /**
   * @private
   *
   * @param {Error} error
   *
   * @returns {error is import('axios').AxiosError}
   */
  // eslint-disable-next-line class-methods-use-this
  isAxiosUnauthorizedError(error) {
    // eslint-disable-next-line no-magic-numbers
    return error && error.isAxiosError && error.response.status === 401;
  }
}

module.exports = { TrustpilotAxiosClient };
