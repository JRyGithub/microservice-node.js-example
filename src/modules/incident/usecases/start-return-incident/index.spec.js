const sinon = require('sinon');
const { expect } = require('chai');
const { StartReturnIncidentUseCase } = require('.');
const { BaseIncident } = require('../../domain/incident/base');
const { ConsumerReturnIncident } = require('../../domain/incident/types/consumer-return');

describe('usecases/start-return-incident', () => {
  let startReturnIncident;
  let incidentRepository;
  let incidents;

  beforeEach(() => {
    incidentRepository = {
      findAllByParcelId: sinon.spy(),
      update: sinon.spy()
    };
    startReturnIncident = new StartReturnIncidentUseCase({
      incidentRepository
    });
  });

  it('should update only CREATED records', async () => {
    const createdIncident = new ConsumerReturnIncident({ status: BaseIncident.STATUSES.CREATED });
    incidents = [
      createdIncident,
      new ConsumerReturnIncident({ status: BaseIncident.STATUSES.RESOLVED }),
      new ConsumerReturnIncident({ status: BaseIncident.STATUSES.REJECTED }),
      new ConsumerReturnIncident({ status: BaseIncident.STATUSES.STARTED })
    ];
    startReturnIncident.incidentRepository.findAllByParcelId = sinon.spy(async () => incidents);
    const result = await startReturnIncident.execute();
    expect(result).to.have.length(1);
    const [incident] = result;
    expect(incident.id).to.be.equal(createdIncident.id);
    expect(incident.status).to.be.equal(BaseIncident.REFUND_STATUSES.STARTED);
    expect(incidentRepository.update).to.have.been.calledOnce;
  });
});
