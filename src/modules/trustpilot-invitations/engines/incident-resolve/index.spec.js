const { expect } = require('chai');
const sinon = require('sinon');
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');
const { IncidentResolveEngine } = require('.');

describe('engines/incident-resolve', () => {
  let parcelId;
  let entityId;
  let entityType;
  let incident;
  let incidentRepository;
  let incidentRepositoryFindByParcelIdStub;
  let incidentResolveEngine;
  let result;

  beforeEach(() => {
    parcelId = 'parcelId';
    entityId = parcelId;
    entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
    incidentRepository = {
      findByParcelId: () => {}
    };
    incidentResolveEngine = new IncidentResolveEngine({ incidentRepository });

    incidentRepositoryFindByParcelIdStub = sinon
      .stub(incidentRepository, 'findByParcelId')
      .resolves(incident);
  });

  afterEach(() => {
    result = undefined;
    incidentRepositoryFindByParcelIdStub.restore();
  });

  async function call() {
    result = await incidentResolveEngine.resolve({ entityId, entityType });
  }

  describe('when input entityType is PARCEL', () => {
    beforeEach(() => {
      entityId = parcelId;
      entityType = TrustpilotInvitation.ENTITY_TYPES.PARCEL;
    });

    describe('when incident does NOT exist', () => {
      beforeEach(() => {
        incidentRepositoryFindByParcelIdStub = incidentRepositoryFindByParcelIdStub.resolves();
      });

      beforeEach(async () => call());

      it('should try to fetch incident by given id', () => {
        expect(incidentRepositoryFindByParcelIdStub).to.have.been.calledOnceWith(parcelId);
      });

      it('should NOT return incident', () => {
        expect(result).to.not.exist;
      });
    });

    describe('when incident exists', () => {
      beforeEach(async () => call());

      it('should try to fetch incident by given id', () => {
        expect(incidentRepositoryFindByParcelIdStub).to.have.been.calledOnceWith(parcelId);
      });

      it('should return found incident', () => {
        expect(result).to.equal(incident);
      });
    });
  });
});
