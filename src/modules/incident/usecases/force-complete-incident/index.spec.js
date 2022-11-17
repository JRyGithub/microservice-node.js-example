const sinon = require('sinon');
const { expect } = require('chai');
const { v4 } = require('uuid');
const FIXTURES = require('../../../../../tests/fixtures/incidents');
const { ManualFlowBaseIncident } = require('../../domain/incident/manual-flow-base');
const { IncidentAppliedResolutionService } = require('../../services/incident-applied-resolution');
const {
  ResourceNotFoundError,
  InvalidManualFlowIncidentError,
  InvalidStatusError,
  BadRequestError
} = require('../../errors');
const { forceCompleteIncidentUsecase } = require('.');
const {
  ProductDamagedInWarehouseIncident
} = require('../../domain/incident/types/product-damaged-in-warehouse');
const {
  MockParcelRepository
} = require('../../../../../tests/fixtures/incidents/mock-parcel-repository');
const {
  MockProductRepository
} = require('../../../../../tests/fixtures/incidents/mock-product-repository');
const {
  MockParcelPicklistRepository
} = require('../../../../../tests/fixtures/incidents/mock-parcel-picklist-repository');
const {
  MockScubStockInfoRepository
} = require('../../../../../tests/fixtures/incidents/mock-scub-stock-info-repository');
const { buildMockParcel } = require('../../../../../tests/fixtures/incidents/parcels');
const {
  buildMockParcelPicklist
} = require('../../../../../tests/fixtures/incidents/parcel-picklists');
const {
  buildMockScubStockInfo
} = require('../../../../../tests/fixtures/incidents/scub-stock-infos');
const { RpcRefundRepository } = require('../../adapters/rpc-refund-repository');

const { UPDATE_INCIDENT_STATUS_PAYLOAD: PAYLOAD } = FIXTURES;

const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');

const { USER_TYPES } = require('../../domain/incident/base');
const { ParcelLateDeliveryIncident } = require('../../domain/incident/types/parcel-late-delivery');

describe('usecases/force-complete-incident', () => {
  class ManualFlowIncident extends ManualFlowBaseIncident {
    constructor(values) {
      // eslint-disable-next-line no-param-reassign
      values.type = 'MANUAL';
      super(values);
    }
  }

  let invoke;
  let incident;
  let incidentRepository;
  let refundRepository;
  let parcelRepository;
  let productRepository;
  let parcelPicklistRepository;
  let scubStockInfoRepository;
  let incidentAppliedResolutionService;
  let usecaseDependencies;
  let invokeLambdaResponses;

  beforeEach(() => {
    incident = new ManualFlowIncident({
      ...FIXTURES.INCIDENT,
      entityId: 'PRODUCT-001',
      entityType: 'PRODUCT'
    });
    invokeLambdaResponses = new Map([
      ['contracts-from-parcel.list:v1', () => [{ id: '123' }]],
      ['refund.create:v1', () => ({ id: FIXTURES.REFUND_ID })],
      ['parcel-picklist.list:v1', () => [{ parcelId: 894770481 }]]
    ]);
    invoke = sinon.fake(async (lambdaName, ...args) =>
      invokeLambdaResponses.has(lambdaName)
        ? invokeLambdaResponses.get(lambdaName)(...args)
        : undefined
    );
    incidentRepository = {
      findById: sinon.spy(async () => incident),
      update: sinon.spy()
    };
    refundRepository = {
      createFromIncident: sinon.spy(async () => FIXTURES.REFUND_ID)
    };
    parcelRepository = new MockParcelRepository();
    productRepository = new MockProductRepository();
    parcelPicklistRepository = new MockParcelPicklistRepository();
    scubStockInfoRepository = new MockScubStockInfoRepository();
    incidentAppliedResolutionService = new IncidentAppliedResolutionService({
      parcelRepository,
      productRepository,
      parcelPicklistRepository,
      scubStockInfoRepository
    });
    usecaseDependencies = {
      incidentRepository,
      refundRepository,
      parcelRepository,
      incidentAppliedResolutionService
    };
  });

  describe('when the incident is not found', () => {
    it('should throw ResourceNotFoundError', async () => {
      incident = null;
      const updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);

      await expect(updateIncidentStatus.execute(PAYLOAD)).to.be.rejectedWith(ResourceNotFoundError);
    });
  });

  it('should reject when incident is automated', async () => {
    incident = new ProductDamagedInWarehouseIncident({
      status: 'CREATED',
      refundStatus: 'CREATED'
    });

    const updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);

    await expect(updateIncidentStatus.execute(PAYLOAD)).to.be.rejectedWith(
      InvalidManualFlowIncidentError
    );
  });

  ['CREATED', 'STARTED'].forEach((status) => {
    it(`should reject when status is ${status}`, async () => {
      incident = new ProductDamagedInWarehouseIncident({
        status: 'CREATED',
        refundStatus: 'CREATED'
      });

      const updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);

      await expect(
        updateIncidentStatus.execute({
          id: 'INCIDENT-001',
          status
        })
      ).to.be.rejectedWith(InvalidStatusError);
    });
  });

  ['RESOLVED', 'REJECTED'].forEach((status) => {
    it(`should reject when incident status is already at ${status}`, async () => {
      incident.status = status;

      const updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);

      await expect(
        updateIncidentStatus.execute({
          id: 'INCIDENT-001',
          status
        })
      ).to.be.rejectedWith(BadRequestError, /cannot be updated/);
    });
  });

  describe('when manually rejecting an incident', () => {
    const REASON = 'Concern is too old';
    let updateIncidentStatus;
    let payload;

    beforeEach(() => {
      updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);
      payload = {
        id: PAYLOAD.id,
        status: 'REJECTED'
      };
    });

    it('should reject requests without rejectedReason', async () => {
      delete payload.rejectedReason;
      await expect(updateIncidentStatus.execute(payload)).to.be.rejectedWith(
        BadRequestError,
        /rejectedReason/
      );
    });

    it('should update incident rejectedReason', async () => {
      payload.rejectedReason = { msg: REASON };
      const result = await updateIncidentStatus.execute(payload);
      expect(result).to.eql(incident);

      expect(incidentRepository.update).to.have.been.calledWithMatch({
        rejectedReason: JSON.stringify([{ msg: REASON }])
      });
    });

    it('should update incident status and refundStatus to REJECTED', async () => {
      payload.rejectedReason = { msg: REASON };

      await updateIncidentStatus.execute(payload);

      expect(incidentRepository.update).to.have.been.calledWithMatch({
        status: 'REJECTED',
        refundStatus: 'REJECTED'
      });
      expect(incident.resolutionTypeApplied).to.eql(null);
    });
  });

  describe('when manually resolving an incident', () => {
    let updateIncidentStatus;
    let payload;

    beforeEach(() => {
      updateIncidentStatus = forceCompleteIncidentUsecase(usecaseDependencies);
      payload = {
        id: PAYLOAD.id,
        status: 'RESOLVED'
      };
    });

    describe('when providing any refund amount', () => {
      it('should update incident status to RESOLVED and refundStatus to RESOLVED', async () => {
        payload.merchandiseValue = 150;
        await updateIncidentStatus.execute(payload);

        expect(incidentRepository.update).to.have.been.calledWithMatch({
          status: 'RESOLVED',
          refundStatus: 'RESOLVED',
          refundId: FIXTURES.REFUND_ID
        });
        expect(incident.resolutionTypeApplied).to.eql('REFUND');
      });

      it('should create related refunds on billing side when merchandise specified', async () => {
        payload.merchandiseValue = 150;
        await updateIncidentStatus.execute(payload);

        expect(refundRepository.createFromIncident).to.have.been.calledOnce;
        const [[{ merchandiseValue, shippingFeesAmount }]] =
          refundRepository.createFromIncident.args;
        expect(merchandiseValue).to.eql(payload.merchandiseValue);
        expect(shippingFeesAmount).to.be.null;
      });

      it('should create related refunds on billing side when shipping fees specified', async () => {
        payload.shippingFeesAmount = 100;
        // should transform that one to null
        payload.merchandiseValue = 0;
        await updateIncidentStatus.execute(payload);

        expect(refundRepository.createFromIncident).to.have.been.calledOnce;
        const [[{ merchandiseValue, shippingFeesAmount }]] =
          refundRepository.createFromIncident.args;
        expect(shippingFeesAmount).to.eql(payload.shippingFeesAmount);
        expect(merchandiseValue).to.be.null;
      });

      it('should add an event to bus when amount is provided', async () => {
        payload.shippingFeesAmount = 100;
        await updateIncidentStatus.execute(payload);
      });

      describe('when source is RECIPIENT', () => {
        beforeEach(() => {
          incident.source = USER_TYPES.RECIPIENT;
        });

        describe('when resolution type applied is REFUND', () => {
          it('should not do shipper refund', async () => {
            await updateIncidentStatus.execute(payload);
            expect(refundRepository.createFromIncident).to.have.not.been.called;
          });
        });
      });
    });

    describe('when not providing any refund amount', () => {
      describe('when source is RECIPIENT', () => {
        let reshippedParcelId;
        let parcelId;
        let scubReshipQuantity;
        let scubAvailableQuantity;
        let parcelFindByIdStub;
        let parcelCloneStub;
        let parcelPicklistfindOneByParcelIdStub;
        let scubsStockInfofindByScubIdsAndWarehouseIdStub;
        let lines;
        let scubs;

        const updateConcerns = async (itemsCount, concernCount) => {
          lines = Array(itemsCount)
            .fill(null)
            .map((line, index) => ({
              id: v4(),
              picklistId: v4(),
              reference: `Product_${index}`,
              productId: v4(),
              quantity: 1
            }));

          scubs = Array(itemsCount)
            .fill(null)
            .map((scub, index) => ({
              id: v4(),
              scubId: v4(),
              picklistLineId: lines[index].id
            }));

          for (let num = 0; num < (concernCount > itemsCount ? itemsCount : concernCount); num++) {
            if (!incident.concerns) incident.concerns = [];

            incident.concerns.push({
              entityId: num < lines.length ? lines[num].productId : v4(),
              entityType: 'PRODUCT',
              type: 'MERCHANDISE',
              quantity: 1
            });
          }
        };

        beforeEach(() => {
          incident.source = USER_TYPES.RECIPIENT;
        });

        beforeEach(() => {
          reshippedParcelId = v4();
          parcelId = v4();
          scubReshipQuantity = 5;
          scubAvailableQuantity = 10;

          parcelFindByIdStub = sinon
            .stub(parcelRepository, 'findById')
            .resolves(buildMockParcel({ id: parcelId }));
          parcelCloneStub = sinon
            .stub(parcelRepository, 'clone')
            .resolves({ id: reshippedParcelId });
          parcelPicklistfindOneByParcelIdStub = sinon
            .stub(parcelPicklistRepository, 'findOneByParcelId')
            .callsFake(() =>
              Promise.resolve(
                buildMockParcelPicklist({
                  parcelId,
                  scubs,
                  lines
                })
              )
            );
          scubsStockInfofindByScubIdsAndWarehouseIdStub = sinon
            .stub(scubStockInfoRepository, 'findByScubIdsAndWarehouseId')
            .callsFake(() =>
              Promise.resolve(
                Array(scubAvailableQuantity)
                  .fill(null)
                  .map((el, index) =>
                    buildMockScubStockInfo({
                      scubId: index < scubs.length ? scubs[index].scubId : v4(),
                      quantityAvailable: 1
                    })
                  )
              )
            );
        });

        afterEach(() => {
          parcelFindByIdStub.restore();
          parcelCloneStub.restore();
          parcelPicklistfindOneByParcelIdStub.restore();
          scubsStockInfofindByScubIdsAndWarehouseIdStub.restore();
        });

        describe('when resolutionTypeSelected is RESHIP', () => {
          beforeEach(() => {
            // there is still amount, when we re-ship to refund shipper
            payload.shippingFeesAmount = 100;
            payload.merchandiseValue = 100;
            incident.resolutionTypeSelected = 'RESHIP';
          });

          describe('when stock can cover amount to reship', () => {
            beforeEach(async () => {
              scubReshipQuantity = 5;
              scubAvailableQuantity = 10;
              await updateConcerns(scubReshipQuantity, scubReshipQuantity);
            });

            it('should handle RESHIP applied resolution properly', async () => {
              await updateIncidentStatus.execute(payload);

              expect(incidentRepository.update).to.have.been.calledWithMatch({
                status: 'RESOLVED',
                resolutionTypeApplied: 'RESHIP'
              });
              expect(parcelCloneStub).to.have.been.calledWithMatch({ id: parcelId });
              expect(incident.reshipParcelId).to.equal(reshippedParcelId);
              expect(refundRepository.createFromIncident).to.have.been.called;
            });
            describe('when source is recipient', () => {
              beforeEach(() => {
                incident = new ManualFlowIncident({
                  ...FIXTURES.INCIDENT,
                  entityId: 'PARCEL-001',
                  entityType: 'PARCEL',
                  source: USER_TYPES.RECIPIENT,
                  resolutionTypeSelected: 'RESHIP',
                  relatedShipperId: 'SHIPPER-001'
                });
                refundRepository = new RpcRefundRepository(invoke);
                updateIncidentStatus = forceCompleteIncidentUsecase({
                  ...usecaseDependencies,
                  refundRepository
                });
              });
              it('should handle RESHIP applied resolution properly and pick up re-shipped parcel', async () => {
                await updateIncidentStatus.execute(payload);
                expect(invoke).to.have.been.calledTwice;
                const [, { items }] = invoke.args[1];
                expect(items[0]).to.include({
                  entityId: reshippedParcelId,
                  entityType: 'PARCEL',
                  type: 'MERCHANDISE_REFUND',
                  amount: 100,
                  algorithm: 'EQUALS'
                });
              });
              it('should update incident status to RESOLVED and refundStatus to RESOLVED', async () => {
                payload.merchandiseValue = 150;
                await updateIncidentStatus.execute(payload);

                expect(incidentRepository.update).to.have.been.calledWithMatch({
                  status: 'RESOLVED',
                  refundStatus: 'RESOLVED',
                  refundId: FIXTURES.REFUND_ID
                });
                expect(incident.resolutionTypeApplied).to.eql('RESHIP');
              });
            });
          });

          describe('when stock can NOT cover amount to reship', () => {
            let fakeDate;
            let sinonFakeTimers;

            beforeEach(async () => {
              scubReshipQuantity = 10;
              scubAvailableQuantity = 5;
              await updateConcerns(scubReshipQuantity, scubReshipQuantity);
              fakeDate = new Date();
              sinonFakeTimers = sinon.useFakeTimers(fakeDate);
            });

            afterEach(() => {
              sinonFakeTimers.restore();
            });

            it('should handle REFUND applied resolution properly', async () => {
              await updateIncidentStatus.execute(payload);

              expect(incidentRepository.update).to.have.been.calledWithMatch({
                status: 'RESOLVED',
                resolutionTypeApplied: 'REFUND',
                decidedToRefundAt: fakeDate
              });
              expect(refundRepository.createFromIncident).to.have.not.been.called;
            });
          });
        });

        describe('when resolutionTypeSelected is REFUND', () => {
          let fakeDate;
          let sinonFakeTimers;

          beforeEach(async () => {
            scubReshipQuantity = 5;
            scubAvailableQuantity = 10;
            await updateConcerns(scubReshipQuantity, scubReshipQuantity);
            fakeDate = new Date();
            sinonFakeTimers = sinon.useFakeTimers(fakeDate);
          });

          afterEach(() => {
            sinonFakeTimers.restore();
          });

          it('should handle REFUND applied resolution properly', async () => {
            await updateIncidentStatus.execute(payload);

            expect(incidentRepository.update).to.have.been.calledWithMatch({
              status: 'RESOLVED',
              resolutionTypeApplied: 'REFUND',
              decidedToRefundAt: fakeDate
            });
            expect(refundRepository.createFromIncident).to.have.not.been.called;
          });
        });

        describe('when parcel late delivery', () => {
          beforeEach(() => {
            incident = new ParcelLateDeliveryIncident({
              ...FIXTURES.INCIDENT,
              entityId: 'PARCEL-001',
              entityType: 'PARCEL',
              source: USER_TYPES.RECIPIENT
            });
          });
          describe('country is not Spain', () => {
            it('should update merchandise value to 6 euros', async () => {
              payload.type = INCIDENT_TYPES.PARCEL_LATE_DELIVERY;
              await updateIncidentStatus.execute(payload);
              expect(incident.merchandiseValue).to.eql(6);
            });
          });
          describe('country is Spain', () => {
            beforeEach(async () => {
              parcelFindByIdStub.restore();
              parcelFindByIdStub = sinon
                .stub(parcelRepository, 'findById')
                .resolves(buildMockParcel({ id: parcelId, address: { country: 'ES' } }));
            });

            it('should update merchandise value to 5 euros', async () => {
              payload.type = INCIDENT_TYPES.PARCEL_LATE_DELIVERY;
              await updateIncidentStatus.execute(payload);
              expect(incident.merchandiseValue).to.eql(5);
            });
          });
        });
      });

      describe('when source is not RECIPIENT', () => {
        it('should update incident status to RESOLVED and let refundStatus to null', async () => {
          await updateIncidentStatus.execute(payload);

          expect(incidentRepository.update).to.have.been.calledWithMatch({
            status: 'RESOLVED',
            refundStatus: null
          });
        });

        it('should not create any refund on billing side', async () => {
          await updateIncidentStatus.execute(payload);

          expect(refundRepository.createFromIncident).to.not.have.been.called;
        });
      });
    });
  });
});
