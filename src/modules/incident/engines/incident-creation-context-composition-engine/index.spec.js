const { expect } = require('chai');
const sinon = require('sinon');
const {
  ConvenientCurrentDateHost
} = require('../../../core/adapters/convenient-current-date-host');
const { BaseIncident } = require('../../domain/incident/base');
const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');
const { IncidentCreationContextCompositionEngine } = require('.');

describe('engines/incident-creation-context-composition', () => {
  let parcelId;
  let parcel;
  let incidentType;
  let currentDate;
  let incidentRepository;
  let shipmentRepository;
  let incidentRepositoryFindAllByParcelId;
  let shipmentRepositoryFindOneByParcelIdStub;
  let result;

  beforeEach(() => {
    parcelId = '123';
    parcel = { id: parcelId };
    incidentType = INCIDENT_TYPES.PARCEL_LATE_DELIVERY;
    currentDate = new Date();
    incidentRepository = {
      findAllByParcelId: () => {}
    };
    shipmentRepository = {
      findOneByParcelId: () => {}
    };
    incidentRepositoryFindAllByParcelId = sinon
      .stub(incidentRepository, 'findAllByParcelId')
      .resolves([{ entityId: parcelId, entityType: BaseIncident.ENTITY_TYPES.PARCEL }]);
    shipmentRepositoryFindOneByParcelIdStub = sinon
      .stub(shipmentRepository, 'findOneByParcelId')
      .resolves({
        id: parcelId,
        state: { deliveryPromise: { before: new Date().toISOString() } }
      });
  });

  afterEach(() => {
    incidentRepositoryFindAllByParcelId.restore();
    shipmentRepositoryFindOneByParcelIdStub.restore();
    result = undefined;
  });

  function instantiate() {
    return new IncidentCreationContextCompositionEngine({
      incidentRepository,
      shipmentRepository,
      currentDateHost: new ConvenientCurrentDateHost(currentDate)
    });
  }

  async function compose() {
    result = await instantiate().compose({
      parcel,
      incidentType
    });
  }

  describe('when similarIncidents is NOT found', () => {
    beforeEach(() => {
      incidentRepositoryFindAllByParcelId = incidentRepositoryFindAllByParcelId.resolves();
    });

    beforeEach(async () => compose());

    afterEach(() => {
      incidentRepositoryFindAllByParcelId.restore();
    });

    it('should try to find similarIncidents', () => {
      expect(incidentRepositoryFindAllByParcelId).to.have.been.calledOnceWith(parcelId);
    });

    it('should try to find shipment', () => {
      expect(shipmentRepositoryFindOneByParcelIdStub).to.have.been.calledOnceWith(parcelId);
    });

    it('should result WITHOUT similarIncidents', () => {
      expect(result).to.exist;
      expect(result.similarIncidents).to.not.exist;
    });
  });

  describe('when deliveryPromise is NOT found', () => {
    beforeEach(() => {
      shipmentRepositoryFindOneByParcelIdStub = shipmentRepositoryFindOneByParcelIdStub.resolves();
    });

    beforeEach(async () => compose());

    afterEach(() => {
      shipmentRepositoryFindOneByParcelIdStub.restore();
    });

    it('should try to find similarIncidents', () => {
      expect(incidentRepositoryFindAllByParcelId).to.have.been.calledOnceWith(parcelId);
    });

    it('should try to find shipment', () => {
      expect(shipmentRepositoryFindOneByParcelIdStub).to.have.been.calledOnceWith(parcelId);
    });

    it('should result WITHOUT deliveryPromise', () => {
      expect(result).to.exist;
      expect(result.deliveryPromise).to.not.exist;
    });
  });

  describe('when everything is OK', () => {
    beforeEach(async () => compose());

    it('should try to find similarIncidents', () => {
      expect(incidentRepositoryFindAllByParcelId).to.have.been.calledOnceWith(parcelId);
    });

    it('should try to find shipment', () => {
      expect(shipmentRepositoryFindOneByParcelIdStub).to.have.been.calledOnceWith(parcelId);
    });

    it('should result with everything', () => {
      expect(result).to.exist;
      expect(result.parcel).to.exist;
      expect(result.similarIncidents).to.exist;
      expect(result.deliveryPromise).to.exist;
      expect(result.currentDate).to.exist;
    });
  });
});
