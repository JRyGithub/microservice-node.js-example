const sinon = require('sinon');
const { expect } = require('chai');
const { ResolveObsoleteReturnIncidentUseCase } = require('.');
const { BaseIncident } = require('../../domain/incident/base');
const { ConsumerReturnIncident } = require('../../domain/incident/types/consumer-return');

describe('usecases/resolve-obsolete-return-incident', () => {
  let resolveObsoleteReturnIncident;
  let incidentRepository;
  let parcelRepository;
  let shipmentRepository;
  let incidents;
  const ORIGINAL_PARCEL_ID = '11111111';
  const RETURN_PARCEL_ID = '11111112';
  const CURRENT_DATE_SLA_BREACH = new Date('2022-01-15');
  const CURRENT_DATE_SLA_NOT_BREACH = new Date('2022-01-26');

  beforeEach(() => {
    incidentRepository = {
      findReturnsByStatus: sinon.spy(async () => [
        new ConsumerReturnIncident({
          entityId: ORIGINAL_PARCEL_ID,
          returns: {
            parcelId: RETURN_PARCEL_ID
          }
        })
      ]),
      update: sinon.spy()
    };
    parcelRepository = {
      findByIds: sinon.spy(async () => [
        { id: RETURN_PARCEL_ID, shippedAt: new Date('2022-01-10').toISOString() },
        { id: ORIGINAL_PARCEL_ID, shippedAt: new Date('2022-01-01').toISOString() }
      ])
    };
    shipmentRepository = {
      findByIds: sinon.spy(async () => [
        {
          id: ORIGINAL_PARCEL_ID,
          state: { deliveryPromise: new Date('2022-01-07').toISOString() }
        }
      ])
    };
    resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
      incidentRepository,
      parcelRepository,
      shipmentRepository,
      now: CURRENT_DATE_SLA_BREACH
    });
  });

  describe('when SLA is breached', () => {
    beforeEach(async () => {
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should have returns incidnets', () => {
      expect(incidents).to.have.length(1);
    });
    it('should trigger update records', () => {
      expect(incidents[0].status).to.be.equal(BaseIncident.REFUND_STATUSES.RESOLVED);
      expect(incidentRepository.update).to.have.been.calledOnce;
    });
  });

  describe('when SLA is not breached', () => {
    beforeEach(async () => {
      resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        shipmentRepository,
        now: CURRENT_DATE_SLA_NOT_BREACH
      });
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should NOT have returns incidnets', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });

  describe('when return parcel is not yet shipped', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [
          { id: RETURN_PARCEL_ID, shippedAt: undefined },
          { id: ORIGINAL_PARCEL_ID, shippedAt: new Date('2022-01-01').toISOString() }
        ])
      };
      shipmentRepository = {
        findByIds: sinon.spy(async () => [
          {
            id: ORIGINAL_PARCEL_ID,
            state: { deliveryPromise: new Date('2022-01-07').toISOString() }
          }
        ])
      };
      resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        shipmentRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should NOT have returns incidnets', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });

  describe('when original parcel dont have delivery promise', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [
          { id: RETURN_PARCEL_ID, shippedAt: new Date('2022-01-10').toISOString() },
          { id: ORIGINAL_PARCEL_ID, shippedAt: new Date('2022-01-01').toISOString() }
        ])
      };
      shipmentRepository = {
        findByIds: sinon.spy(async () => [
          {
            id: ORIGINAL_PARCEL_ID,
            state: { deliveryPromise: undefined }
          }
        ])
      };
      resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        shipmentRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should NOT have returns incidnets', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });

  describe('when original parcel is not shipped', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [
          { id: RETURN_PARCEL_ID, shippedAt: new Date('2022-01-10').toISOString() },
          { id: ORIGINAL_PARCEL_ID, shippedAt: undefined }
        ])
      };
      shipmentRepository = {
        findByIds: sinon.spy(async () => [
          {
            id: ORIGINAL_PARCEL_ID,
            state: { deliveryPromise: new Date('2022-01-07').toISOString() }
          }
        ])
      };
      resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        shipmentRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should NOT have returns incidnets', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });

  describe('when parcels are not found', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [])
      };
      shipmentRepository = {
        findByIds: sinon.spy(async () => [])
      };
      resolveObsoleteReturnIncident = new ResolveObsoleteReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        shipmentRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveObsoleteReturnIncident.execute();
    });
    it('should NOT have returns incidnets', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });
});
