/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const env = require('../../../../env');
const { EnvHost } = require('../../../core/adapters/env-host');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const { TokensHostNotFoundError, TokenNotFoundError, TokenExpiredError } = require('../../errors');
const { MockedLogger } = require('../../../../../tests/logger');
const { TrustpilotAxiosClient } = require('.');

const AXIOS_REFRESH_TOKENS_URL = '/v1/oauth/oauth-business-users-for-applications/refresh';
const AXIOS_RETRIEVE_TOKENS_URL = '/v1/oauth/oauth-business-users-for-applications/accesstoken';

const AXIOS_RESPONSE_TOKEN_DATA = {
  access_token: '123',
  expires_in: '123',
  issued_at: '123',
  refresh_token: '123',
  refresh_token_expires_in: '123',
  refresh_token_issued_at: '123'
};
const AXIOS_REFRESH_TOKEN_RESPONSE = { data: AXIOS_RESPONSE_TOKEN_DATA };
const AXIOS_RETRIEVE_TOKEN_RESPONSE = { data: AXIOS_RESPONSE_TOKEN_DATA };

describe('adapters/trustpilot-axios-client', () => {
  let url;
  let data;
  let config;
  let trustpilotTokenStorage;
  let axios;
  let envHost;
  let loggerFactory;
  let trustpilotTokenStorageGetAccessTokenStub;
  let trustpilotTokenStorageGetRefreshTokenStub;
  let trustpilotTokenStorageSetTokensStub;
  let axiosPostStub;
  let axiosGetStub;
  let trustpilotAxiosClient;

  beforeEach(() => {
    url = 'url';
    data = {};
    config = {};
    trustpilotTokenStorage = {
      getAccessToken: () => {},
      getRefreshToken: () => {},
      setTokens: () => {}
    };
    axios = {
      post: () => {},
      get: () => {}
    };
    envHost = new EnvHost(env);
    loggerFactory = new TransientContextualizedLoggerFactory({
      context: {},
      innerLogger: new MockedLogger()
    });
    trustpilotAxiosClient = new TrustpilotAxiosClient({
      trustpilotTokenStorage,
      axios,
      envHost,
      loggerFactory
    });

    trustpilotTokenStorageSetTokensStub = sinon
      .stub(trustpilotTokenStorage, 'setTokens')
      .resolves();

    axiosGetStub = sinon.stub(axios, 'get').resolves();
  });

  afterEach(() => {
    trustpilotTokenStorageSetTokensStub.restore();
    axiosGetStub.restore();
  });

  describe('#post()', () => {
    describe('when NO tokens host found', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokensHostNotFoundError())
          .resolves('access_token');

        trustpilotTokenStorageGetRefreshTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getRefreshToken')
          .onFirstCall()
          .throws(new TokensHostNotFoundError())
          .resolves('refresh_token');

        axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
          if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
            return AXIOS_RETRIEVE_TOKEN_RESPONSE;
          }
        });
      });

      beforeEach(async () => {
        await trustpilotAxiosClient.post(url, data, config);
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
        trustpilotTokenStorageGetRefreshTokenStub.restore();
        axiosPostStub.restore();
      });

      it('should try to get access token from storage', () => {
        expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
      });

      it('should try to get refresh token from storage', () => {
        expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
      });

      it('should NOT try to refresh tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
      });

      it('should try to retrieve tokens via API', () => {
        expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
      });

      it('should try to execute request', () => {
        expect(axiosPostStub).to.have.been.calledWith(url);
      });
    });

    describe('when access token NOT found', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokenNotFoundError('ACCESS'))
          .resolves('access_token');
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
      });

      describe('when refresh token NOT found', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .onFirstCall()
            .throws(new TokenNotFoundError('REFRESH'))
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
              return AXIOS_RETRIEVE_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.post(url, data, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should NOT try to refresh tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosPostStub).to.have.been.calledWith(url);
        });
      });

      describe('when refresh token found', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
              return AXIOS_REFRESH_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.post(url, data, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should try to refresh tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should NOT try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosPostStub).to.have.been.calledWith(url);
        });
      });
    });

    describe('when access token expired', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokenExpiredError('ACCESS'))
          .resolves('access_token');
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
      });
      describe('when refresh token expired', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .onFirstCall()
            .throws(new TokenExpiredError('REFRESH'))
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
              return AXIOS_RETRIEVE_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.post(url, data, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should NOT try to refresh tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosPostStub).to.have.been.calledWith(url);
        });
      });

      describe('when refresh token is NOT expired', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
              return AXIOS_REFRESH_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.post(url, data, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should try to refresh tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should NOT try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosPostStub).to.have.been.calledWith(url);
        });
      });
    });

    describe('when everything is OK', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .resolves('access_token');

        trustpilotTokenStorageGetRefreshTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getRefreshToken')
          .resolves('refresh_token');

        axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
          if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
            return AXIOS_REFRESH_TOKEN_RESPONSE;
          }
        });
      });

      beforeEach(async () => {
        await trustpilotAxiosClient.post(url, data, config);
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
        trustpilotTokenStorageGetRefreshTokenStub.restore();
        axiosPostStub.restore();
      });

      it('should try to get tokens from storage', () => {
        expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
      });

      it('should NOT try to get refresh tokens', () => {
        expect(trustpilotTokenStorageGetRefreshTokenStub).to.not.have.been.called;
      });

      it('should NOT try to refresh tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
      });

      it('should NOT try to retrieve tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
      });

      it('should try to execute request', () => {
        expect(axiosPostStub).to.have.been.calledWith(url);
      });
    });
  });

  describe('#get()', () => {
    describe('when NO tokens host found', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokensHostNotFoundError())
          .resolves('access_token');

        trustpilotTokenStorageGetRefreshTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getRefreshToken')
          .onFirstCall()
          .throws(new TokensHostNotFoundError())
          .resolves('refresh_token');

        axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
          if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
            return AXIOS_RETRIEVE_TOKEN_RESPONSE;
          }
        });
      });

      beforeEach(async () => {
        await trustpilotAxiosClient.get(url, config);
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
        trustpilotTokenStorageGetRefreshTokenStub.restore();
        axiosPostStub.restore();
      });

      it('should try to get access token from storage', () => {
        expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
      });

      it('should try to get refresh token from storage', () => {
        expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
      });

      it('should NOT try to refresh tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
      });

      it('should try to retrieve tokens via API', () => {
        expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
      });

      it('should try to execute request', () => {
        expect(axiosGetStub).to.have.been.calledWith(url);
      });
    });

    describe('when access token NOT found', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokensHostNotFoundError())
          .resolves('access_token');
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
      });

      describe('when refresh token NOT found', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .onFirstCall()
            .throws(new TokensHostNotFoundError())
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
              return AXIOS_RETRIEVE_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.get(url, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should NOT try to refresh tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosGetStub).to.have.been.calledWith(url);
        });
      });

      describe('when refresh token found', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
              return AXIOS_REFRESH_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.get(url, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should try to refresh tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should NOT try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosGetStub).to.have.been.calledWith(url);
        });
      });
    });

    describe('when access token expired', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .onFirstCall()
          .throws(new TokenExpiredError('ACCESS'))
          .resolves('access_token');
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
      });
      describe('when refresh token expired', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .onFirstCall()
            .throws(new TokenExpiredError('REFRESH'))
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_RETRIEVE_TOKENS_URL) {
              return AXIOS_RETRIEVE_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.get(url, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should NOT try to refresh tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosGetStub).to.have.been.calledWith(url);
        });
      });

      describe('when refresh token is NOT expired', () => {
        beforeEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub = sinon
            .stub(trustpilotTokenStorage, 'getRefreshToken')
            .resolves('refresh_token');

          axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
            if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
              return AXIOS_REFRESH_TOKEN_RESPONSE;
            }
          });
        });

        beforeEach(async () => {
          await trustpilotAxiosClient.get(url, config);
        });

        afterEach(() => {
          trustpilotTokenStorageGetRefreshTokenStub.restore();
          axiosPostStub.restore();
        });

        it('should try to get access token from storage', () => {
          expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
        });

        it('should try to get refresh token from storage', () => {
          expect(trustpilotTokenStorageGetRefreshTokenStub).to.have.been.calledOnce;
        });

        it('should try to refresh tokens via API', () => {
          expect(axiosPostStub).to.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
        });

        it('should NOT try to retrieve tokens via API', () => {
          expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
        });

        it('should try to execute request', () => {
          expect(axiosGetStub).to.have.been.calledWith(url);
        });
      });
    });

    describe('when everything is OK', () => {
      beforeEach(() => {
        trustpilotTokenStorageGetAccessTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getAccessToken')
          .resolves('access_token');

        trustpilotTokenStorageGetRefreshTokenStub = sinon
          .stub(trustpilotTokenStorage, 'getRefreshToken')
          .resolves('refresh_token');

        axiosPostStub = sinon.stub(axios, 'post').callsFake((givenUrl) => {
          if (givenUrl === AXIOS_REFRESH_TOKENS_URL) {
            return AXIOS_REFRESH_TOKEN_RESPONSE;
          }
        });
      });

      beforeEach(async () => {
        await trustpilotAxiosClient.get(url, config);
      });

      afterEach(() => {
        trustpilotTokenStorageGetAccessTokenStub.restore();
        trustpilotTokenStorageGetRefreshTokenStub.restore();
        axiosPostStub.restore();
      });

      it('should try to get tokens from storage', () => {
        expect(trustpilotTokenStorageGetAccessTokenStub).to.have.been.called;
      });

      it('should NOT try to get refresh tokens', () => {
        expect(trustpilotTokenStorageGetRefreshTokenStub).to.not.have.been.called;
      });

      it('should NOT try to refresh tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_REFRESH_TOKENS_URL);
      });

      it('should NOT try to retrieve tokens via API', () => {
        expect(axiosPostStub).to.not.have.been.calledWith(AXIOS_RETRIEVE_TOKENS_URL);
      });

      it('should try to execute request', () => {
        expect(axiosGetStub).to.have.been.calledWith(url);
      });
    });
  });
});
