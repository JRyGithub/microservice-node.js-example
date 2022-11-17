/* eslint-disable consistent-return */
const { ResourceNotFoundError } = require('@devcubyn/core.errors');
const { expect } = require('chai');
const sinon = require('sinon');
const { BaseIncident } = require('../../../incident/domain/incident/base');
const {
  TrustpilotInvitation,
  createTrustpilotInvitation
} = require('../../domain/trustpilot-invitation');
const {
  TrustpilotInvitationCancelComputationContext
} = require('../../domain/trustpilot-invitation-cancel-computation-context');
const { InvitationCancelComputationContextCompositionEngine } = require('.');

describe('engines/invitation-cancel-computation-context-composition', () => {
  let parcelId;
  let incidentId;
  let shipperId;
  let incidentRequesterId;
  let parcel;
  let incident;
  let shipper;
  let incidentRequester;
  let trustpilotInvitation;
  let trustpilotInvitations;
  let parcelResolveEngine;
  let incidentResolveEngine;
  let userRepository;
  let incidentRequesterRepository;
  let invitationCancelComputationContextCompositionEngine;
  let parcelResolveEngineResolveStub;
  let incidentResolveEngineResolveStub;
  let userRepositoryFindByIdStub;
  let incidentRequesterRepositoryFindByIdStub;
  let result;
  let error;

  beforeEach(() => {
    parcelId = '123';
    incidentId = '456';
    shipperId = '789';
    incidentRequesterId = 'incidentRequesterId';
    parcel = {
      id: parcelId,
      shipperId
    };
    incident = new BaseIncident({
      id: incidentId,
      source: BaseIncident.SOURCES.RECIPIENT,
      ownerId: incidentRequesterId
    });
    shipper = {
      id: shipperId
    };
    incidentRequester = { id: incidentRequesterId, language: 'en' };
    trustpilotInvitation = createTrustpilotInvitation({
      entityId: parcelId,
      entityType: TrustpilotInvitation.ENTITY_TYPES.PARCEL
    });
    trustpilotInvitations = [trustpilotInvitation];
    parcelResolveEngine = {
      resolve: () => {}
    };
    incidentResolveEngine = {
      resolve: () => {}
    };
    userRepository = {
      findOneById: () => {}
    };
    incidentRequesterRepository = {
      findById: () => {}
    };
    invitationCancelComputationContextCompositionEngine =
      new InvitationCancelComputationContextCompositionEngine({
        parcelResolveEngine,
        incidentResolveEngine,
        userRepository,
        incidentRequesterRepository
      });

    parcelResolveEngineResolveStub = sinon.stub(parcelResolveEngine, 'resolve').resolves(parcel);
    incidentResolveEngineResolveStub = sinon
      .stub(incidentResolveEngine, 'resolve')
      .resolves(incident);
    userRepositoryFindByIdStub = sinon.stub(userRepository, 'findOneById').resolves(shipper);
    incidentRequesterRepositoryFindByIdStub = sinon
      .stub(incidentRequesterRepository, 'findById')
      .resolves(incidentRequester);

    result = undefined;
    error = undefined;
  });

  afterEach(() => {
    parcelResolveEngineResolveStub.restore();
    incidentResolveEngineResolveStub.restore();
    userRepositoryFindByIdStub.restore();
    incidentRequesterRepositoryFindByIdStub.restore();
  });

  describe('#compose()', () => {
    async function call() {
      try {
        result = await invitationCancelComputationContextCompositionEngine.compose({
          trustpilotInvitation
        });

        return result;
      } catch (innerError) {
        error = innerError;
      }
    }

    describe('when incident exists', () => {
      describe('when incidentRequester exists', () => {
        describe('when parcel is NOT found', () => {
          beforeEach(() => {
            parcelResolveEngineResolveStub = parcelResolveEngineResolveStub.resolves();
          });

          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should throw an error', () => {
            expect(error).to.be.instanceOf(ResourceNotFoundError);
          });
        });

        describe('when parcel.shipperId is NOT truthy', () => {
          beforeEach(() => {
            parcel.shipperId = undefined;
          });

          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should throw an error', () => {
            expect(error).to.be.instanceOf(ResourceNotFoundError);
          });
        });

        describe('when shipper is NOT found', () => {
          beforeEach(() => {
            userRepositoryFindByIdStub = userRepositoryFindByIdStub.resolves();
          });

          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find shipper', () => {
            expect(userRepositoryFindByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
          });

          it('should throw an error', () => {
            expect(error).to.be.instanceOf(ResourceNotFoundError);
          });
        });

        describe('when everything is OK', () => {
          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find shipper', () => {
            expect(userRepositoryFindByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
          });

          it('should try to find incident', () => {
            expect(incidentResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find incidentRequester', () => {
            expect(incidentRequesterRepositoryFindByIdStub).to.have.been.calledOnceWith(
              incidentRequesterId
            );
          });

          it('should return result', () => {
            expect(result).to.be.instanceOf(TrustpilotInvitationCancelComputationContext);
            expect(result).to.have.property('trustpilotInvitation', trustpilotInvitation);
            expect(result).to.have.property('parcel', parcel);
            expect(result).to.have.property('shipper', shipper);
            expect(result).to.have.property('incidentRequester', incidentRequester);
          });
        });
      });

      describe('when incidentRequester does NOT exist', () => {
        beforeEach(() => {
          incidentRequesterRepositoryFindByIdStub =
            incidentRequesterRepositoryFindByIdStub.resolves();
        });

        describe('when everything is OK', () => {
          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find shipper', () => {
            expect(userRepositoryFindByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
          });

          it('should try to find incident', () => {
            expect(incidentResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find incidentRequester', () => {
            expect(incidentRequesterRepositoryFindByIdStub).to.have.been.calledOnceWith(
              incidentRequesterId
            );
          });

          it('should return result', () => {
            expect(result).to.be.instanceOf(TrustpilotInvitationCancelComputationContext);
            expect(result).to.have.property('trustpilotInvitation', trustpilotInvitation);
            expect(result).to.have.property('parcel', parcel);
            expect(result).to.have.property('shipper', shipper);
            expect(result).to.not.have.property('incidentRequester', incidentRequester);
          });
        });
      });
    });

    describe('when incident does NOT exist', () => {
      describe('when incidentRequester does NOT exist', () => {
        beforeEach(() => {
          incidentResolveEngineResolveStub = incidentResolveEngineResolveStub.resolves();
        });

        describe('when everything is OK', () => {
          beforeEach(async () => call());

          it('should try to find parcel', () => {
            expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should try to find shipper', () => {
            expect(userRepositoryFindByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
          });

          it('should try to find incident', () => {
            expect(incidentResolveEngineResolveStub).to.have.been.calledOnceWith({
              entityId: trustpilotInvitation.entityId,
              entityType: trustpilotInvitation.entityType
            });
          });

          it('should NOT try to find incidentRequester', () => {
            expect(incidentRequesterRepositoryFindByIdStub).to.not.have.been.called;
          });

          it('should return result', () => {
            expect(result).to.be.instanceOf(TrustpilotInvitationCancelComputationContext);
            expect(result).to.have.property('trustpilotInvitation', trustpilotInvitation);
            expect(result).to.have.property('parcel', parcel);
            expect(result).to.have.property('shipper', shipper);
            expect(result).to.not.have.property('incidentRequester', incidentRequester);
          });
        });
      });
    });
  });

  describe('#composeMany()', () => {
    async function call() {
      try {
        result = await invitationCancelComputationContextCompositionEngine.composeMany({
          trustpilotInvitations
        });

        return result;
      } catch (innerError) {
        error = innerError;
      }
    }

    describe('when everything is OK', () => {
      beforeEach(async () => call());

      it('should return result', () => {
        expect(result).to.have.property('succeed');
        expect(result).to.have.property('errorHosts');
      });
    });
  });
});
