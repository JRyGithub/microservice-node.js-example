const sinon = require('sinon');
const { expect } = require('chai');
const { ResolveNotShippedReturnIncidentUseCase } = require('.');
const { ConsumerReturnIncident } = require('../../domain/incident/types/consumer-return');

describe('usecases/resolve-not-shipped-return-incident', () => {
  let resolveNotShippedReturnIncident;
  let incidentRepository;
  let parcelRepository;
  let incidents;
  const ORIGINAL_PARCEL_ID = '11111111';
  const RETURN_PARCEL_ID = '11111112';
  const CURRENT_DATE_SLA_BREACH = new Date('2022-01-27');

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
        { id: RETURN_PARCEL_ID, shippedAt: undefined },
        { id: ORIGINAL_PARCEL_ID, deliveredAt: new Date('2021-09-15').toISOString() }
      ])
    };
    resolveNotShippedReturnIncident = new ResolveNotShippedReturnIncidentUseCase({
      incidentRepository,
      parcelRepository,
      now: CURRENT_DATE_SLA_BREACH
    });
  });

  describe('when return parcel is not yet shipped and SLA breach', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [
          { id: RETURN_PARCEL_ID, shippedAt: undefined },
          { id: ORIGINAL_PARCEL_ID, deliveredAt: new Date('2021-09-15').toISOString() }
        ])
      };
      resolveNotShippedReturnIncident = new ResolveNotShippedReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveNotShippedReturnIncident.execute();
    });
    it('should trigger update records', async () => {
      expect(incidentRepository.update).to.have.been.called;
    });
  });

  describe('when return parcel is not yet shipped and SLA NOT breach', () => {
    beforeEach(async () => {
      parcelRepository = {
        findByIds: sinon.spy(async () => [
          { id: RETURN_PARCEL_ID, shippedAt: undefined },
          { id: ORIGINAL_PARCEL_ID, deliveredAt: new Date('2022-01-26').toISOString() }
        ])
      };
      resolveNotShippedReturnIncident = new ResolveNotShippedReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveNotShippedReturnIncident.execute();
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.have.not.been.called;
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
      resolveNotShippedReturnIncident = new ResolveNotShippedReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveNotShippedReturnIncident.execute();
    });
    it('should NOT have returns incidents', () => {
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
      resolveNotShippedReturnIncident = new ResolveNotShippedReturnIncidentUseCase({
        incidentRepository,
        parcelRepository,
        now: CURRENT_DATE_SLA_BREACH
      });
      incidents = await resolveNotShippedReturnIncident.execute();
    });
    it('should NOT have returns incidents', () => {
      expect(incidents).to.have.length(0);
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
    });
  });
});
