const { expect } = require('chai');
const sinon = require('sinon');
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');
const { RpcParcelRepository } = require('../../../incident/adapters/rpc-parcel-repository');
const { SqlIncidentRepository } = require('../../../incident/adapters/sql-incident-repository');
const { ParcelResolveEngine } = require('.');

describe('engines/parcel-resolve', () => {
  let parcelId;
  let entityId;
  let entityType;
  let incidentRepository;
  let parcelRepository;
  let parcelRepositoryFindByIdStub;
  let parcelResolveEngine;

  beforeEach(() => {
    parcelId = '123';
    entityId = parcelId;
    entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
    incidentRepository = new SqlIncidentRepository();
    parcelRepository = new RpcParcelRepository(() => {});
    parcelResolveEngine = new ParcelResolveEngine({ incidentRepository, parcelRepository });

    parcelRepositoryFindByIdStub = sinon.stub(parcelRepository, 'findById').resolves({});
  });

  afterEach(() => {
    parcelRepositoryFindByIdStub.restore();
  });

  describe('when input entityType is PARCEL', () => {
    beforeEach(() => {
      entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
      entityId = parcelId;
    });

    beforeEach(async () => {
      await parcelResolveEngine.resolve({ entityType, entityId });
    });

    it('should try to fetch parcel', () => {
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
  });
});
