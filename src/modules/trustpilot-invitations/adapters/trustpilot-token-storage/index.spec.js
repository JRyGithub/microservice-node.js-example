const { expect } = require('chai');
const sinon = require('sinon');
const {
  ConvenientCurrentDateHost
} = require('../../../core/adapters/convenient-current-date-host');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const { SqlTrustpilotTokenRepository } = require('../sql-trustpilot-token-repository');
const { asyncCatchError } = require('../../../../../tests/catch');
const { TokensHostNotFoundError, TokenNotFoundError, TokenExpiredError } = require('../../errors');
const { MockedLogger } = require('../../../../../tests/logger');
const { TrustpilotTokenStorage } = require('.');

describe('adapters/trustpilot-token-storage', () => {
  let tokensHost;
  let trustpilotTokenRepository;
  let currentDate;
  let trustpilotTokenRepositoryFindTokensHostStub;
  let trustpilotTokenRepositoryRemoveAccessTokenStub;
  let trustpilotTokenRepositoryRemoveRefreshTokenStub;
  let result;
  let error;

  function instantiate() {
    return new TrustpilotTokenStorage({
      trustpilotTokenRepository,
      currentDateHost: new ConvenientCurrentDateHost(currentDate),
      loggerFactory: new TransientContextualizedLoggerFactory({
        context: {},
        innerLogger: new MockedLogger()
      })
    });
  }

  beforeEach(() => {
    tokensHost = {
      accessToken: '123',
      accessTokenIssuedAt: 123,
      accessTokenExpiresIn: 123,
      refreshToken: '123',
      refreshTokenIssuedAt: 123,
      refreshTokenExpiresIn: 123
    };
    trustpilotTokenRepository = new SqlTrustpilotTokenRepository();
  });

  describe('#getAccessToken()', () => {
    describe('when tokensHost is not found', () => {
      beforeEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(undefined);
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getAccessToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokensHostNotFoundError);
      });
    });

    describe('when no access token assigned', () => {
      beforeEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves({});
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getAccessToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokenNotFoundError);
      });
    });

    describe('when token expired', () => {
      beforeEach(() => {
        currentDate = 100;
        tokensHost.accessTokenIssuedAt = 50;
        tokensHost.accessTokenExpiresIn = 10;

        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(tokensHost);

        trustpilotTokenRepositoryRemoveAccessTokenStub = sinon
          .stub(trustpilotTokenRepository, 'removeAccessToken')
          .resolves();
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getAccessToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
        trustpilotTokenRepositoryRemoveAccessTokenStub.restore();
      });

      it('should remove access token by calling repo', () => {
        expect(trustpilotTokenRepositoryRemoveAccessTokenStub).to.have.been.calledOnce;
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokenExpiredError);
      });
    });

    describe('when everything is OK', () => {
      beforeEach(() => {
        currentDate = 55;
        tokensHost.accessTokenIssuedAt = 50;
        tokensHost.accessTokenExpiresIn = 10;

        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(tokensHost);
      });

      beforeEach(async () => {
        result = await instantiate().getAccessToken();
      });

      it('should return accessToken', () => {
        expect(result).to.equal(tokensHost.accessToken);
      });
    });
  });

  describe('#getRefreshToken()', () => {
    describe('when tokensHost is not found', () => {
      beforeEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(undefined);
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getRefreshToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokensHostNotFoundError);
      });
    });

    describe('when no refresh token assigned', () => {
      beforeEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves({});
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getRefreshToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokenNotFoundError);
      });
    });

    describe('when token expired', () => {
      beforeEach(() => {
        currentDate = 100;
        tokensHost.refreshTokenIssuedAt = 50;
        tokensHost.refreshTokenExpiresIn = 10;

        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(tokensHost);

        trustpilotTokenRepositoryRemoveRefreshTokenStub = sinon
          .stub(trustpilotTokenRepository, 'removeRefreshToken')
          .resolves();
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => instantiate().getRefreshToken());
      });

      afterEach(() => {
        trustpilotTokenRepositoryFindTokensHostStub.restore();
        trustpilotTokenRepositoryRemoveRefreshTokenStub.restore();
      });

      it('should remove refresh token by calling repo', () => {
        expect(trustpilotTokenRepositoryRemoveRefreshTokenStub).to.have.been.calledOnce;
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(TokenExpiredError);
      });
    });

    describe('when everything is OK', () => {
      beforeEach(() => {
        currentDate = 55;
        tokensHost.refreshTokenIssuedAt = 50;
        tokensHost.refreshTokenExpiresIn = 10;

        trustpilotTokenRepositoryFindTokensHostStub = sinon
          .stub(trustpilotTokenRepository, 'findTokensHost')
          .resolves(tokensHost);
      });

      beforeEach(async () => {
        result = await instantiate().getRefreshToken();
      });

      it('should return refreshToken', () => {
        expect(result).to.equal(tokensHost.refreshToken);
      });
    });
  });

  describe('#setTokens()', () => {
    let trustpilotInvitationRepositorySetTokensHostStub;

    beforeEach(() => {
      trustpilotInvitationRepositorySetTokensHostStub = sinon
        .stub(trustpilotTokenRepository, 'setTokensHost')
        .resolves();
    });

    beforeEach(async () => {
      await instantiate().setTokens(tokensHost);
    });

    afterEach(() => {
      trustpilotInvitationRepositorySetTokensHostStub.restore();
    });

    it('should call repo method', () => {
      expect(trustpilotInvitationRepositorySetTokensHostStub).to.have.been.calledOnceWith(
        tokensHost
      );
    });
  });
});
