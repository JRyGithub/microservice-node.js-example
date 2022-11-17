/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');
const {
  TrustpilotInvitation,
  TrustpilotInvitationOfTypeParcel,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const { SqlIncidentRepository } = require('../../../incident/adapters/sql-incident-repository');
const {
  TrustpilotInvitationCancelComputationContext
} = require('../../domain/trustpilot-invitation-cancel-computation-context');
const { UnknownTrustpilotInvitationEntityType } = require('../../errors');
const { UnknownTrustpilotInvitation } = require('./tests/unknown-trustpilot-invitation');
// eslint-disable-next-line no-unused-vars
const { InvitationCancelComputationResult, InvitationCancelComputationEngine } = require('.');

describe('engines/invitation-cancel-computation', () => {
  let parcelId;
  let shipperId;
  let trustpilotInvitation;
  let parcel;
  let shipper;
  let incidentRepository;
  let invitationCancelComputationEngine;
  let incidentRepositoryFindByParcelIdStub;
  let result;
  let error;

  beforeEach(() => {
    parcelId = '123';
    shipperId = '789';
    trustpilotInvitation = createTrustpilotInvitation({
      firstName: 'First',
      lastName: 'Last',
      email: 'a@b.c.',
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
      entityId: parcelId,
      status: TrustpilotInvitation.STATUSES.TO_DO
    });
    parcel = { id: parcelId, shipperId, isTrustedDestination: true };
    shipper = { id: shipperId, salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK };
    incidentRepository = new SqlIncidentRepository();
    invitationCancelComputationEngine = new InvitationCancelComputationEngine({
      incidentRepository
    });

    result = undefined;
    error = undefined;
  });

  describe('#compute()', () => {
    async function call() {
      try {
        result = await invitationCancelComputationEngine.compute(
          new TrustpilotInvitationCancelComputationContext({
            trustpilotInvitation,
            parcel,
            shipper
          })
        );

        return result;
      } catch (innerError) {
        error = innerError;
      }
    }

    describe('when shipper is NOT part of delivery network', () => {
      beforeEach(() => {
        shipper.salesCategory = 'ANOTHER';
      });

      it('should return cancelled result', async () => {
        await call();

        expect(result.cancel).to.be.true;
      });

      it('should assign proper reason', async () => {
        await call();

        expect(result.reason).to.equal(
          TrustpilotInvitation.REASONS.SHIPPER_IS_NOT_A_PART_OF_DELIVERY_NETWORK
        );
      });
    });

    describe('when parcel destination is NOT trusted', () => {
      beforeEach(() => {
        parcel.isTrustedDestination = false;
      });

      it('should return cancelled result', async () => {
        await call();

        expect(result.cancel).to.be.true;
      });

      it('should assign proper reason', async () => {
        await call();

        expect(result.reason).to.equal(
          TrustpilotInvitation.REASONS.PARCEL_DESTINATION_IS_NOT_TRUSTED
        );
      });
    });

    describe('when entity type is unknown', () => {
      beforeEach(() => {
        trustpilotInvitation = new UnknownTrustpilotInvitation(trustpilotInvitation);
      });

      it('should throw an error', async () => {
        await call();

        expect(error).to.be.instanceOf(UnknownTrustpilotInvitationEntityType);
      });
    });

    describe('when entity type is PARCEL', () => {
      beforeEach(() => {
        trustpilotInvitation = createTrustpilotInvitation({
          ...trustpilotInvitation,
          entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
          entityId: parcelId
        });
      });

      describe('when incident exists for provided parcelId', () => {
        beforeEach(() => {
          incidentRepositoryFindByParcelIdStub = sinon
            .stub(incidentRepository, 'findByParcelId')
            .resolves({});
        });

        beforeEach(async () => call());

        afterEach(() => {
          incidentRepositoryFindByParcelIdStub.restore();
        });

        it('should try to fetch incident', () => {
          expect(incidentRepositoryFindByParcelIdStub).to.have.been.calledOnce;
        });

        it('should return cancelled result', () => {
          expect(result.cancel).to.be.true;
        });

        it('should assign proper reason', () => {
          expect(result.reason).to.equal(TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS);
        });
      });

      describe('when incident does NOT exist for provided parcelId', () => {
        beforeEach(() => {
          incidentRepositoryFindByParcelIdStub = sinon
            .stub(incidentRepository, 'findByParcelId')
            .resolves(undefined);
        });

        beforeEach(async () => call());

        afterEach(() => {
          incidentRepositoryFindByParcelIdStub.restore();
        });

        it('should try to fetch incident', () => {
          expect(incidentRepositoryFindByParcelIdStub).to.have.been.calledOnce;
        });

        it('should return confirmed result', () => {
          expect(result.cancel).to.be.false;
        });
      });
    });
  });

  describe('#computeMany()', () => {
    describe('when multiple TIs provided', () => {
      let trustpilotInvitation1;
      let trustpilotInvitation2;

      async function call() {
        try {
          const contexts = [trustpilotInvitation1, trustpilotInvitation2].map(
            (innerTrustpilotInvitation) =>
              new TrustpilotInvitationCancelComputationContext({
                trustpilotInvitation: innerTrustpilotInvitation,
                parcel,
                shipper
              })
          );
          result = await invitationCancelComputationEngine.computeMany(contexts);

          return result;
        } catch (innerError) {
          error = innerError;
        }
      }

      describe('when PARCEL x2', () => {
        let parcelId1;
        let parcelId2;

        beforeEach(() => {
          parcelId1 = parcelId;
          parcelId2 = '789';

          trustpilotInvitation1 = createTrustpilotInvitation({
            ...trustpilotInvitation,
            entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
            entityId: parcelId1
          });
          trustpilotInvitation2 = createTrustpilotInvitation({
            ...trustpilotInvitation,
            entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL,
            entityId: parcelId2
          });
        });

        describe('when one of parcelIds has assigned incident', () => {
          beforeEach(() => {
            incidentRepositoryFindByParcelIdStub = sinon
              .stub(incidentRepository, 'findByParcelId')
              .onFirstCall()
              .resolves({})
              .onSecondCall()
              .resolves(undefined);
          });

          afterEach(() => {
            incidentRepositoryFindByParcelIdStub.restore();
          });

          beforeEach(async () => call());

          it('should try to fetch incident twice', () => {
            expect(incidentRepositoryFindByParcelIdStub).to.have.been.calledTwice;
          });

          it('should return CONFIRMED x1 (PARCEL), CANCELLED x1 (PARCEL)', () => {
            expect(result.confirmed.length).to.equal(1);
            expect(result.cancelled.length).to.equal(1);

            const confirmedOfTypeParcelCount = result.confirmed.filter(
              resultHasTIOfTypeParcelPredicate
            ).length;
            const cancelledOfTypeParcelCount = result.cancelled.filter(
              resultHasTIOfTypeParcelPredicate
            ).length;

            expect(confirmedOfTypeParcelCount).to.equal(1, 'invalid confirmedOfTypeParcelCount');
            expect(cancelledOfTypeParcelCount).to.equal(1, 'invalid cancelledOfTypeParcelCount');
          });

          it('should assign proper reasons', () => {
            const everyCancelledResultHasProperReason = result.cancelled.every(
              ({ reason }) => reason === TrustpilotInvitation.REASONS.INCIDENT_FOR_PARCEL_EXISTS
            );

            expect(everyCancelledResultHasProperReason).to.be.true;
          });
        });
      });
    });

    describe('when NO TIs provided', () => {
      let invitationCancelComputationEngineComputeSpy;

      async function call() {
        try {
          result = await invitationCancelComputationEngine.computeMany([]);

          return result;
        } catch (innerError) {
          error = innerError;
        }
      }

      beforeEach(() => {
        invitationCancelComputationEngineComputeSpy = sinon.spy(
          invitationCancelComputationEngine,
          'compute'
        );
      });

      beforeEach(async () => call());

      afterEach(() => {
        invitationCancelComputationEngineComputeSpy.restore();
      });

      it('should NOT call inner #compute()', () => {
        expect(invitationCancelComputationEngineComputeSpy).to.not.have.been.called;
      });

      it('should return CONFIRMED x0, CANCELLED x0', () => {
        expect(result.confirmed.length).to.equal(0);
        expect(result.cancelled.length).to.equal(0);
      });
    });
  });
});

/**
 * @param {InvitationCancelComputationResult} result
 */
function resultHasTIOfTypeParcelPredicate(result) {
  return result.context.trustpilotInvitation instanceof TrustpilotInvitationOfTypeParcel;
}
