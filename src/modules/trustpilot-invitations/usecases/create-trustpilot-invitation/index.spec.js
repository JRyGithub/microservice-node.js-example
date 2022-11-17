/* eslint-disable consistent-return */
const { expect } = require('chai');
const sinon = require('sinon');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../../core/constants/users');
const {
  PARCEL_STATUS_CARRIER_DELIVERED,
  PARCEL_TYPE_DUPLICATE
} = require('../../../core/constants/parcels');
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');
const {
  ParcelIsNotDeliveredTICError,
  ParcelNotFoundTICError,
  ParcelIsNotValidTICError,
  ShipperNotFoundTICError,
  ShipperIsNotAPartOfDeliveryNetworkTICError,
  ParcelDestinationIsNotTrustedTICError
} = require('../../errors');
const { CreateTrustpilotInvitationUsecase } = require('.');
const { EnvHost } = require('../../../core/adapters/env-host');
const { buildEnv } = require('../../../../../tests/env');

describe('usecases/create-trustpilot-invitations', () => {
  let entityId;
  let entityType;
  let partialEntity;
  let shipperId;
  let parcel;
  let shipper;
  let trustpilotInvitationRepository;
  let userRepository;
  let parcelResolveEngine;
  let trustpilotInvitationRepositoryCreateStub;
  let userRepositoryFindOneByIdStub;
  let parcelResolveEngineResolveStub;
  let createTrustpilotInvitationUsecase;
  let result;
  let error;
  const env = buildEnv({
    TRUSTPILOT_SHIPPER_BLACKLIST: '1234567,123456'
  });
  const envHost = new EnvHost(env);

  async function call() {
    try {
      result = await createTrustpilotInvitationUsecase.execute({
        entityId,
        entityType,
        partialEntity,
        envHost
      });

      return result;
    } catch (innerError) {
      error = innerError;
    }
  }

  beforeEach(() => {
    entityId = '123';
    entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
    partialEntity = { id: entityId, status: PARCEL_STATUS_CARRIER_DELIVERED };
    shipperId = '456';
    parcel = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'a@b.c',
      shipperId,
      isTrustedDestination: true
    };
    shipper = {
      id: shipperId,
      salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK
    };
    trustpilotInvitationRepository = {
      create: () => {}
    };
    userRepository = {
      findOneById: () => {}
    };
    parcelResolveEngine = {
      resolve: () => {}
    };
    createTrustpilotInvitationUsecase = new CreateTrustpilotInvitationUsecase({
      trustpilotInvitationRepository,
      userRepository,
      parcelResolveEngine,
      envHost
    });

    trustpilotInvitationRepositoryCreateStub = sinon
      .stub(trustpilotInvitationRepository, 'create')
      .resolves();
    userRepositoryFindOneByIdStub = sinon.stub(userRepository, 'findOneById').resolves(shipper);
    parcelResolveEngineResolveStub = sinon.stub(parcelResolveEngine, 'resolve').resolves(parcel);
  });

  afterEach(() => {
    result = null;
    error = null;
    trustpilotInvitationRepositoryCreateStub.restore();
    userRepositoryFindOneByIdStub.restore();
    parcelResolveEngineResolveStub.restore();
  });

  describe('when entityType === PARCEL', () => {
    describe('when partialEntity.status is NOT CARRIER_DELIVERED', () => {
      beforeEach(() => {
        partialEntity.status = 'ANOTHER';
      });

      beforeEach(async () => call());

      it('should throw an error', () => {
        expect(error).to.be.instanceOf(ParcelIsNotDeliveredTICError);
        expect(error.extras.partialEntity).to.equal(partialEntity);
      });
    });
  });

  describe('when parcel is NOT found', () => {
    beforeEach(() => {
      parcelResolveEngineResolveStub = parcelResolveEngineResolveStub.resolves();
    });

    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ParcelNotFoundTICError);
      expect(error.extras.entityId).to.equal(entityId);
      expect(error.extras.entityType).to.equal(entityType);
    });
  });

  describe('when parcel destination is NOT trusted', () => {
    beforeEach(() => {
      parcel.isTrustedDestination = false;
    });

    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ParcelDestinationIsNotTrustedTICError);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when parcel is NOT valid (names, email)', () => {
    beforeEach(() => {
      parcel.firstName = null;
      parcel.lastName = null;
      parcel.email = null;
    });

    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ParcelIsNotValidTICError);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when parcel is NOT valid (duplicate)', () => {
    beforeEach(() => {
      parcel.type = PARCEL_TYPE_DUPLICATE;
    });

    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ParcelIsNotValidTICError);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when shipper does NOT exist', () => {
    beforeEach(() => {
      userRepositoryFindOneByIdStub = userRepositoryFindOneByIdStub.resolves();
    });

    beforeEach(async () => call());

    afterEach(() => {
      userRepositoryFindOneByIdStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should try to find shipper', () => {
      expect(userRepositoryFindOneByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ShipperNotFoundTICError);
      expect(error.extras.shipperId).to.equal(shipperId);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when shipper is NOT a part of delivery network', () => {
    beforeEach(() => {
      shipper.salesCategory = 'ANOTHER';
    });

    beforeEach(async () => call());

    afterEach(() => {
      userRepositoryFindOneByIdStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should try to find shipper', () => {
      expect(userRepositoryFindOneByIdStub).to.have.been.calledOnceWith(parcel.shipperId);
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ShipperIsNotAPartOfDeliveryNetworkTICError);
      expect(error.extras.shipper).to.equal(shipper);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when parcel shipper is blacklisted', () => {
    beforeEach(() => {
      parcel.shipperId = '1234567';
    });

    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should throw an error', () => {
      expect(error).to.be.instanceOf(ParcelIsNotValidTICError);
      expect(error.extras.parcel).to.equal(parcel);
    });
  });

  describe('when everything is OK', () => {
    beforeEach(async () => call());

    afterEach(() => {
      parcelResolveEngineResolveStub.restore();
      trustpilotInvitationRepositoryCreateStub.restore();
    });

    it('should try to find parcel', () => {
      expect(parcelResolveEngineResolveStub).to.have.been.calledOnceWith({
        entityId,
        entityType
      });
    });

    it('should create tpInvite', () => {
      expect(trustpilotInvitationRepositoryCreateStub).to.have.been.calledOnce;
    });

    it('should return id of created tpInvite', () => {
      expect(result).to.exist;
    });
  });
});
