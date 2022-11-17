const { expect } = require('chai');
const sinon = require('sinon');
const { EnvHost } = require('../../../core/adapters/env-host');
const { asyncCatchError } = require('../../../../../tests/catch');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const { LANGUAGES } = require('../../engines/invitation-send/constants/languages');
const { SendInvitationError } = require('../../errors');
const { buildEnv } = require('../../../../../tests/env');
const { TrustpilotClient } = require('.');

describe('adapters/trustpilot-client', () => {
  let TRUSTPILOT_INVITATION_DEFAULT_LOCALE;
  let innerError;
  let parcelId;
  let trustpilotInvitation;
  let language;
  let templateId;
  let trustpilotAxiosClient;
  let trustpilotAxiosClientPostStub;
  let trustpilotClient;
  let error;

  beforeEach(() => {
    TRUSTPILOT_INVITATION_DEFAULT_LOCALE = 'TRUSTPILOT_INVITATION_DEFAULT_LOCALE';
    innerError = new Error('Inner error');
    parcelId = '123';
    trustpilotInvitation = createTrustpilotInvitation({
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
      entityId: parcelId
    });
    language = LANGUAGES.EN;
    templateId = 'templateId';
    trustpilotAxiosClient = {
      post: () => {}
    };
  });

  function instantiate() {
    const envHost = new EnvHost(buildEnv({ TRUSTPILOT_INVITATION_DEFAULT_LOCALE }));
    trustpilotClient = new TrustpilotClient({ trustpilotAxiosClient, envHost });

    return trustpilotClient;
  }

  async function call() {
    return instantiate().sendInvitation(trustpilotInvitation, parcelId, {
      language,
      templateId
    });
  }

  describe('#sendInvitation()', () => {
    describe('when inner axios client throws an error', () => {
      beforeEach(() => {
        trustpilotAxiosClientPostStub = sinon
          .stub(trustpilotAxiosClient, 'post')
          .throws(innerError);
      });

      beforeEach(async () => {
        error = await asyncCatchError(async () => call());
      });

      afterEach(() => {
        trustpilotAxiosClientPostStub.restore();
      });

      it('should try to call inner axios client', () => {
        expect(trustpilotAxiosClientPostStub).to.have.been.calledOnce;
      });

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(SendInvitationError);
        expect(error.innerError).to.equal(innerError);
      });
    });

    describe('when everything is OK', () => {
      beforeEach(() => {
        trustpilotAxiosClientPostStub = sinon.stub(trustpilotAxiosClient, 'post').resolves();
      });

      afterEach(() => {
        trustpilotAxiosClientPostStub.restore();
      });

      it('should try to call inner axios client', async () => {
        await call();

        expect(trustpilotAxiosClientPostStub).to.have.been.calledOnce;
      });

      describe('when invitation has entityType === PARCEL', () => {
        beforeEach(() => {
          trustpilotInvitation.entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
        });

        it('should assign specific tags', async () => {
          await call();

          const payload = trustpilotAxiosClientPostStub.args[0][1];

          expect(payload.serviceReviewInvitation.tags).to.have.members([
            TrustpilotClient.TAGS.FRICTIONLESS_48H
          ]);
        });
      });
    });
  });
});
