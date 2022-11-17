/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');
const { EnvHost } = require('../../../core/adapters/env-host');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const {
  TrustpilotInvitationSendContext
} = require('../../domain/trustpilot-invitation-send-context');
const { LANGUAGES } = require('./constants/languages');
const { buildEnv } = require('../../../../../tests/env');
const { InvitationSendEngine } = require('.');

describe('engines/invitation-send', () => {
  let TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID;
  let TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID;
  let TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID;
  let TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE;
  let TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID;
  let parcelId;
  let shipperId;
  let parcel;
  let shipper;
  let trustpilotInvitation;
  let trustpilotClient;
  let trustpilotClientSendInvitationStub;
  let invitationSendEngine;
  let result;
  let applicationRepository;

  beforeEach(() => {
    TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID = 'TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID';
    TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID = 'TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID';
    TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID = 'TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID';
    TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE = LANGUAGES.FR;
    TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID = 'TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID';
    parcelId = '123';
    shipperId = '456';
    parcel = { id: parcelId, shipperId };
    shipper = { id: shipperId, salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK };
    trustpilotInvitation = createTrustpilotInvitation({
      firstName: 'First',
      lastName: 'Last',
      email: 'a@b.c.',
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
      entityId: parcelId,
      status: TrustpilotInvitation.STATUSES.TO_DO
    });
    parcel.address = { country: 'en' };
    parcel.viaApplicationId = 12345;
    parcel.shipper = { id: 123, organizationName: 'Cubyn' };
    trustpilotClient = {
      sendInvitation: () => {}
    };
    applicationRepository = {
      findById: () => [{ classId: 3, class: { name: 'API Cubyn' } }]
    };
  });

  beforeEach(() => {
    trustpilotClientSendInvitationStub = sinon
      .stub(trustpilotClient, 'sendInvitation')
      .resolves({});
  });

  afterEach(() => {
    trustpilotClientSendInvitationStub.restore();
  });

  function instantiate() {
    const envHost = new EnvHost(
      buildEnv({
        TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID,
        TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID,
        TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID,
        TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE,
        TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID
      })
    );
    invitationSendEngine = new InvitationSendEngine({
      trustpilotClient,
      envHost,
      applicationRepository
    });

    return invitationSendEngine;
  }

  describe('#send()', () => {
    async function call() {
      result = await instantiate().send(
        new TrustpilotInvitationSendContext({
          trustpilotInvitation,
          parcel,
          shipper
        })
      );

      return result;
    }

    beforeEach(() => {
      result = undefined;
    });

    describe('when client does NOT fail', () => {
      describe('when parcel.address does NOT exist', () => {
        beforeEach(() => {
          parcel.address = null;
        });

        beforeEach(async () => call());

        it('should call client', () => {
          expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
            trustpilotInvitation,
            parcelId
          );
        });

        it('should return succeed result', () => {
          expect(result.succeed).to.be.true;
        });
      });

      describe('when parcel exists', () => {
        describe('when parcel country is NOT supported', () => {
          beforeEach(() => {
            parcel.address.country = 'unsupported_language';
          });

          describe('when default language is EN', () => {
            beforeEach(() => {
              TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE = LANGUAGES.EN;
            });

            beforeEach(async () => call());

            it('should call client with default language and related templateId', () => {
              expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
                trustpilotInvitation,
                parcelId,
                {
                  language: TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE,
                  templateId: TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID
                }
              );
            });

            it('should return succeed result', () => {
              expect(result.succeed).to.be.true;
            });
          });

          describe('when default language is FR', () => {
            beforeEach(() => {
              TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE = LANGUAGES.FR;
            });

            beforeEach(async () => call());

            it('should call client with default language and related templateId', () => {
              expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
                trustpilotInvitation,
                parcelId,
                {
                  language: TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE,
                  templateId: TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID
                }
              );
            });

            it('should return succeed result', () => {
              expect(result.succeed).to.be.true;
            });
          });
        });

        describe('when parcel.address.country supported', () => {
          describe('when parcel.address.country = en', () => {
            beforeEach(() => {
              parcel.address.country = 'en';
            });

            beforeEach(async () => call());

            it('should call client with default language and related templateId', () => {
              expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
                trustpilotInvitation,
                parcelId,
                {
                  language: LANGUAGES.EN,
                  templateId: TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID
                }
              );
            });

            it('should return succeed result', () => {
              expect(result.succeed).to.be.true;
            });
          });

          describe('when parcel.address.country = fr', () => {
            beforeEach(() => {
              parcel.address.country = 'fr';
            });

            beforeEach(async () => call());

            it('should call client with default language and related templateId', () => {
              expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
                trustpilotInvitation,
                parcelId,
                {
                  language: LANGUAGES.FR,
                  templateId: TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID
                }
              );
            });

            it('should return succeed result', () => {
              expect(result.succeed).to.be.true;
            });
          });
        });
      });
    });

    describe('when client fails', () => {
      beforeEach(() => {
        trustpilotClientSendInvitationStub = trustpilotClientSendInvitationStub.throws(new Error());
      });

      beforeEach(async () => call());

      it('should call client', () => {
        expect(trustpilotClientSendInvitationStub).to.have.been.calledOnceWith(
          trustpilotInvitation,
          parcelId
        );
      });

      it('should return failed result', () => {
        expect(result.succeed).to.be.false;
      });
    });
  });

  describe('#sendMany()', () => {
    describe('when multiple TIs provided', () => {
      let trustpilotInvitation1;
      let trustpilotInvitation2;
      let trustpilotInvitation3;

      async function call() {
        const contexts = [trustpilotInvitation1, trustpilotInvitation2, trustpilotInvitation3].map(
          (innerTrustpilotInvitation) =>
            new TrustpilotInvitationSendContext({
              trustpilotInvitation: innerTrustpilotInvitation,
              parcel,
              shipper
            })
        );
        result = await instantiate().sendMany(contexts);

        return result;
      }

      beforeEach(() => {
        trustpilotInvitation1 = trustpilotInvitation;
        trustpilotInvitation2 = trustpilotInvitation;
        trustpilotInvitation3 = trustpilotInvitation;
      });

      describe('when trustpilot client fails once', () => {
        beforeEach(() => {
          trustpilotClientSendInvitationStub = trustpilotClientSendInvitationStub
            .onFirstCall()
            .throws(new Error())
            .resolves({});
        });

        beforeEach(async () => call());

        it('should call client thrice', () => {
          expect(trustpilotClientSendInvitationStub).to.have.been.calledThrice;
          expect(trustpilotClientSendInvitationStub).to.have.been.calledWith(
            trustpilotInvitation,
            parcelId
          );
        });

        it('should return SUCCEED x2, FAILED x1', () => {
          expect(result.succeed.length).to.equal(2);
          expect(result.failed.length).to.equal(1);
        });
      });
    });

    describe('when NO TIs provided', () => {
      let invitationSendEngineSendSpy;

      async function call() {
        result = await instantiate().sendMany([]);

        return result;
      }

      beforeEach(() => {
        invitationSendEngineSendSpy = sinon.spy(invitationSendEngine, 'send');
      });

      beforeEach(async () => call());

      afterEach(() => {
        invitationSendEngineSendSpy.restore();
      });

      it('should NOT call inner #send()', () => {
        expect(invitationSendEngineSendSpy).to.not.have.been.called;
      });

      it('should return SUCCEED x0, FAILED x0', () => {
        expect(result.succeed.length).to.equal(0);
        expect(result.failed.length).to.equal(0);
      });
    });
  });
});
