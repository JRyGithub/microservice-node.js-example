/* eslint-disable consistent-return */
const { v4: uuid } = require('uuid');
const { expect } = require('chai');
const sinon = require('sinon');
const { transaction } = require('objection');
const { USER_SALES_CATEGORY_DELIVERY_NETWORK } = require('../../modules/core/constants/users');
const { PARCEL_STATUS_CARRIER_DELIVERED } = require('../../modules/core/constants/parcels');
const { knex } = require('../../drivers/mysql');
const { tryToRollback } = require('../../../tests/try-to-rollback');
const { findSpecificIncident } = require('./tests/queries/find-specific-incident');
const { buildParcel } = require('./tests/utils/parcel');
const { handler } = require('.');

describe('listeners/parcel.carrier-status-updated:v1', () => {
  let shipperId;
  let parcelId;
  let parcel;
  let shipper;
  let invoke;
  let context;
  let trx;
  let parcelRepository;
  let userRepository;
  let parcelRepositoryFindByIdStub;
  let userRepositoryFindOneByIdStub;

  async function callHandler() {
    return handler(
      { data: parcel, invoke, context },
      { trxFactory: async () => trx, parcelRepository, userRepository }
    );
  }

  beforeEach(async () => {
    shipperId = uuid();
    parcelId = uuid();
    parcel = buildParcel({
      id: parcelId,
      status: PARCEL_STATUS_CARRIER_DELIVERED,
      shipperId,
      isTrustedDestination: true
    });
    shipper = { id: shipperId, salesCategory: USER_SALES_CATEGORY_DELIVERY_NETWORK };
    invoke = () => {};
    context = {};
    // eslint-disable-next-line cubyn/transaction
    trx = await transaction.start(knex);
    parcelRepository = {
      findById: () => {}
    };
    userRepository = {
      findOneById: () => {}
    };
    parcelRepositoryFindByIdStub = sinon.stub(parcelRepository, 'findById').resolves(parcel);
    userRepositoryFindOneByIdStub = sinon.stub(userRepository, 'findOneById').resolves(shipper);
  });

  afterEach(async () => {
    parcelRepositoryFindByIdStub.restore();
    userRepositoryFindOneByIdStub.restore();
    await tryToRollback(trx);
  });

  describe('success path', () => {
    describe('when parcel exists', () => {
      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        parcelRepositoryFindByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcel.id,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.exist;
      });
    });
  });

  describe('error path', () => {
    describe('when parcel status !== CARRIER_DELIVERED', () => {
      beforeEach(async () => {
        parcel = buildParcel({ id: parcelId, status: 'SOME_OTHER_STATUS' });
      });

      beforeEach(async () => {
        await callHandler();
      });

      it('should NOT try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.not.have.been.called;
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });

    describe('when parcel does NOT exist', () => {
      beforeEach(async () => {
        parcelRepositoryFindByIdStub = parcelRepositoryFindByIdStub.resolves();
      });

      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        parcelRepositoryFindByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcelId,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });

    describe('when parcel destination is NOT trusted', () => {
      beforeEach(async () => {
        parcel.isTrustedDestination = false;
      });

      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        parcelRepositoryFindByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcelId,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });

    describe('when parcel is NOT valid', () => {
      beforeEach(async () => {
        parcel.firstName = false;
        parcel.lastName = false;
        parcel.email = false;
      });

      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        parcelRepositoryFindByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcelId,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });

    describe('when shipper does NOT exist', () => {
      beforeEach(async () => {
        userRepositoryFindOneByIdStub = userRepositoryFindOneByIdStub.resolves();
      });

      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        userRepositoryFindOneByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcelId,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should try to fetch shipper', () => {
        expect(userRepositoryFindOneByIdStub).to.have.been.calledOnceWith(shipperId);
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });

    describe('when shipper is NOT a part of delivery network', () => {
      beforeEach(async () => {
        userRepositoryFindOneByIdStub = userRepositoryFindOneByIdStub.resolves({
          id: shipperId,
          salesCategory: 'ANOTHER'
        });
      });

      beforeEach(async () => {
        await callHandler();
      });

      afterEach(async () => {
        userRepositoryFindOneByIdStub.restore();
      });

      it('should try to resolve parcel', () => {
        expect(parcelRepositoryFindByIdStub).to.have.been.calledOnceWith({
          id: parcelId,
          includes: [
            'parcel.validations',
            'parcel.admin',
            'parcel.pii',
            'parcel.isTrustedDestination',
            'parcel.details'
          ]
        });
      });

      it('should try to fetch shipper', () => {
        expect(userRepositoryFindOneByIdStub).to.have.been.calledOnceWith(shipperId);
      });

      it('should NOT create tpInvite', async () => {
        const tpInvite = await findSpecificIncident({ parcelId });

        expect(tpInvite).to.not.exist;
      });
    });
  });
});
