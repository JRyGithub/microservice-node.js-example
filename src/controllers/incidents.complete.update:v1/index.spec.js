const { expect } = require('chai');
const sinon = require('sinon');
const { v4 } = require('uuid');
const { RpcRefundRepository } = require('../../modules/incident/adapters/rpc-refund-repository');
const { RpcParcelRepository } = require('../../modules/incident/adapters/rpc-parcel-repository');
const { RpcProductRepository } = require('../../modules/incident/adapters/rpc-product-repository');
const {
  RpcParcelPicklistRepository
} = require('../../modules/incident/adapters/rpc-parcel-picklist-repository');
const {
  RpcScubStockInfoRepository
} = require('../../modules/incident/adapters/rpc-scub-stock-info-repository');
const { RpcMessageRepository } = require('../../modules/incident/adapters/rpc-message-repository');
const IncidentModel = require('../../modules/models/incident');
const { handler } = require('.');
const { buildMockParcel } = require('../../../tests/fixtures/incidents/parcels');
const { buildMockParcelPicklist } = require('../../../tests/fixtures/incidents/parcel-picklists');
const { buildMockScubStockInfo } = require('../../../tests/fixtures/incidents/scub-stock-infos');
const IncidentRequesterModel = require('../../modules/models/incident-requester');
const IncidentConcernModel = require('../../modules/models/incident-concern');

describe('controllers/incidents.complete.update:v1', () => {
  const INCIDENT_ID = 'INCIDENT-001';
  const REFUND_ID = 99887766;
  const USER_ID = 10001;
  let language;
  let invoke;
  let controller;
  let messageRepository;
  let invokeLambdaResponses;
  const context = { application: { id: '1234' } };

  beforeEach(async () => {
    language = 'en';
    await IncidentModel.query().insert({
      id: INCIDENT_ID,
      status: 'CREATED',
      refundStatus: 'CREATED',
      ownerId: USER_ID,
      origin: 'TEST',
      entityId: '97531',
      entityType: 'PRODUCT',
      type: 'PARCEL_MISSING_PRODUCT',
      isManuallyUpdated: false
    });
    invokeLambdaResponses = new Map([
      ['contracts-from-parcel.list:v1', () => [{ id: '123' }]],
      ['refund.create:v1', () => ({ id: REFUND_ID })],
      ['parcel-picklist.list:v1', () => [{ parcelId: 894770481 }]]
    ]);
    invoke = sinon.fake(async (lambdaName, ...args) =>
      invokeLambdaResponses.has(lambdaName)
        ? invokeLambdaResponses.get(lambdaName)(...args)
        : undefined
    );
    messageRepository = new RpcMessageRepository(invoke);
    controller = (data) =>
      handler(
        { data, invoke, context },
        {
          refundRepository: new RpcRefundRepository(invoke),
          parcelRepository: new RpcParcelRepository(invoke),
          productRepository: new RpcProductRepository(invoke),
          parcelPicklistRepository: new RpcParcelPicklistRepository(invoke),
          scubStockInfoRepository: new RpcScubStockInfoRepository(invoke),
          messageRepository
        }
      );
  });

  afterEach(async () => {
    await IncidentModel.query().findById(INCIDENT_ID).delete();
  });

  describe('when rejecting an incident', () => {
    // this can be { key: 'PARCEL_NEVER_RECEIVED', data: ['some additional text'] } as well.
    const REASON = { msg: 'rejection reason' };

    it('should update incident statuses', async () => {
      await controller({
        params: { id: INCIDENT_ID },
        body: {
          status: 'REJECTED',
          rejectedReason: REASON
        }
      });

      const rejectedIncident = await IncidentModel.query().findById(INCIDENT_ID);

      expect(rejectedIncident.status).to.eql('REJECTED');
      expect(rejectedIncident.refundStatus).to.eql('REJECTED');
      expect(rejectedIncident.rejectedReason).to.eql([REASON]);
      expect(rejectedIncident.isManuallyUpdated).to.eql(true);
    });
  });

  describe('when resolving an incident', () => {
    let data;

    beforeEach(() => {
      data = {
        params: { id: INCIDENT_ID },
        body: {
          status: 'RESOLVED'
        }
      };
    });

    describe('when amount is specified', () => {
      beforeEach(() => {
        data.body.merchandiseValue = 150;
        data.body.shippingFeesAmount = 100;
      });

      it('should update incident status and save refund amounts', async () => {
        await controller(data);

        const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

        expect(resolvedIncident.status).to.eql('RESOLVED');
        expect(resolvedIncident.refundStatus).to.eql('RESOLVED');
        expect(resolvedIncident.refundId).to.eql(REFUND_ID);
        expect(resolvedIncident.shippingFeesAmount).to.eql(100);
        expect(resolvedIncident.merchandiseValue).to.eql(data.body.merchandiseValue);
      });

      it('should send refunds on billing side', async () => {
        await controller(data);

        expect(invoke).to.have.been.calledTwice;
        const payload = invoke.args[1][1];
        expect(invoke.args[1][0]).to.eql('refund.create:v1');
        expect(payload).to.include({
          externalId: INCIDENT_ID,
          source: 'INCIDENT',
          userId: USER_ID
        });
        expect(payload.items).to.have.length(3);
        expect(payload.items[0]).to.include({
          type: 'MERCHANDISE_REFUND',
          amount: 150,
          algorithm: 'EQUALS'
        });
        expect(payload.items[1]).to.include({
          type: 'PARCEL_SHIPPING',
          amount: 100,
          algorithm: 'SUM_PERCENT'
        });
        expect(payload.items[2]).to.include({
          type: 'PARCEL_PETROL_FEE',
          amount: 100,
          algorithm: 'SUM_PERCENT'
        });
      });
    });

    describe('when amount is not specified', () => {
      describe('when source is RECIPIENT', () => {
        const parcelId = 123;
        let requesterId;
        let scubReshipQuantity;
        let scubAvailableQuantity;
        let parcelReadStub;
        let parcelCreateStub;
        let parcelPicklistListStub;
        let storageInventoryUserStockListStub;
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
            await IncidentConcernModel.query().insert({
              incidentId: INCIDENT_ID,
              entityId: num < lines.length ? lines[num].productId : v4(),
              entityType: 'PRODUCT',
              type: 'MERCHANDISE',
              quantity: 1
            });
          }
        };

        afterEach(async () => {
          IncidentRequesterModel.query().delete();
        });
        beforeEach(async () => {
          language = undefined;

          const requester = await IncidentRequesterModel.query().insert({
            firstName: 'test',
            lastName: 'test',
            email: 'test@cubyn.com',
            bankInfo: '{}',
            language
          });
          requesterId = requester.id;

          await IncidentModel.query().findById(INCIDENT_ID).update({
            source: 'RECIPIENT',
            ownerId: requesterId,
            relatedShipperId: '123'
          });
        });

        beforeEach(async () => {
          parcelReadStub = sinon.stub().resolves(buildMockParcel({ id: parcelId }));
          parcelCreateStub = sinon.stub().resolves([buildMockParcel({ id: parcelId })]);
          parcelPicklistListStub = sinon.stub().callsFake(async () => [
            buildMockParcelPicklist({
              parcelId,
              scubs,
              lines
            })
          ]);

          storageInventoryUserStockListStub = sinon.stub().callsFake(async () =>
            Array(scubAvailableQuantity)
              .fill(null)
              .map((el, index) =>
                buildMockScubStockInfo({
                  scubId: index < scubs.length ? scubs[index].scubId : v4(),
                  quantityAvailable: 1
                })
              )
          );

          invokeLambdaResponses = new Map([
            ...invokeLambdaResponses.entries(),
            ['parcel.read:v1', parcelReadStub],
            ['parcel.create:v1', parcelCreateStub],
            ['parcel-picklist.list:v1', parcelPicklistListStub],
            ['storage-inventory__user-stock.list:v1', storageInventoryUserStockListStub]
          ]);
        });

        describe('when requester.language is NOT set', () => {
          describe('when resolutionTypeSelected is RESHIP', () => {
            beforeEach(async () => {
              await IncidentModel.query().findById(INCIDENT_ID).update({
                resolutionTypeSelected: 'RESHIP'
              });
            });

            describe('when stock can cover amount to reship', () => {
              beforeEach(async () => {
                scubReshipQuantity = 5;
                scubAvailableQuantity = 10;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
              });

              it('should handle RESHIP applied resolution properly', async () => {
                await controller(data);

                const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

                expect(resolvedIncident).to.have.property('status', 'RESOLVED');
                expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'RESHIP');
                expect(resolvedIncident).to.have.property(
                  'reshipParcelId',
                  resolvedIncident.reshipParcelId
                );
                expect(parcelCreateStub).to.have.been.calledOnce;
                expect(invoke).to.have.be.calledWith('email.send:v1', {
                  from: 'Cubyn <noreply@cubyn.com>',
                  to: 'test@cubyn.com',
                  templateName: 'claim-valid-all-set',
                  language,
                  data: {
                    details: {
                      cubid: resolvedIncident.reshipParcelId,
                      address: '',
                      deliveryDate: '',
                      products: []
                    },
                    action: 'RESHIP'
                  }
                });
              });
            });

            describe('when stock can NOT cover amount to reship', () => {
              beforeEach(async () => {
                scubReshipQuantity = 10;
                scubAvailableQuantity = 5;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
                data.body.merchandiseValue = 150;
                data.body.shippingFeesAmount = 100;
              });

              it('should handle REFUND applied resolution properly', async () => {
                await controller(data);

                const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

                expect(resolvedIncident).to.have.property('status', 'RESOLVED');
                expect(resolvedIncident).to.not.have.property('refundStatus', 'RESOLVED');
                expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'REFUND');
                expect(resolvedIncident).to.have.property('decidedToRefundAt');
                expect(invoke).to.have.be.calledWith('email.send:v1', {
                  from: 'Cubyn <noreply@cubyn.com>',
                  to: 'test@cubyn.com',
                  templateName: 'claim-valid-out-of-stock',
                  language,
                  data: { details: { amount: 150 } }
                });
              });
            });

            describe('when notify thrown an error', () => {
              beforeEach(async () => {
                scubReshipQuantity = 10;
                scubAvailableQuantity = 5;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
                data.body.merchandiseValue = 150;
                data.body.shippingFeesAmount = 100;
                messageRepository.claimResolvedOutOfStock = () => {
                  throw new Error('Test');
                };
              });
              it('to throw an error', async () => {
                await expect(controller(data)).to.be.rejectedWith(Error, 'Test');
              });
            });
          });

          describe('when resolutionTypeSelected is REFUND', () => {
            it('should handle REFUND applied resolution properly', async () => {
              await controller(data);

              const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

              expect(resolvedIncident).to.have.property('status', 'RESOLVED');
              expect(resolvedIncident).to.not.have.property('refundStatus', 'RESOLVED');
              expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'REFUND');
              expect(resolvedIncident).to.have.property('decidedToRefundAt');
            });
          });
        });

        describe('when requester.language is set', () => {
          beforeEach(async () => {
            language = 'en';

            await IncidentRequesterModel.query().findById(requesterId).update({ language });
          });

          describe('when resolutionTypeSelected is RESHIP', () => {
            beforeEach(async () => {
              await IncidentModel.query().findById(INCIDENT_ID).update({
                resolutionTypeSelected: 'RESHIP'
              });
            });

            describe('when stock can cover amount to reship', () => {
              beforeEach(async () => {
                scubReshipQuantity = 5;
                scubAvailableQuantity = 10;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
              });

              it('should handle RESHIP applied resolution properly', async () => {
                await controller(data);

                const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

                expect(resolvedIncident).to.have.property('status', 'RESOLVED');
                expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'RESHIP');
                expect(resolvedIncident).to.have.property(
                  'reshipParcelId',
                  resolvedIncident.reshipParcelId
                );
                expect(parcelCreateStub).to.have.been.calledOnce;
                expect(invoke).to.have.be.calledWith('email.send:v1', {
                  from: 'Cubyn <noreply@cubyn.com>',
                  to: 'test@cubyn.com',
                  templateName: 'claim-valid-all-set',
                  language,
                  data: {
                    details: {
                      cubid: resolvedIncident.reshipParcelId,
                      address: '',
                      deliveryDate: '',
                      products: []
                    },
                    action: 'RESHIP'
                  }
                });
              });
            });

            describe('when stock can NOT cover amount to reship', () => {
              beforeEach(async () => {
                scubReshipQuantity = 10;
                scubAvailableQuantity = 5;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
                data.body.merchandiseValue = 150;
                data.body.shippingFeesAmount = 100;
              });

              it('should handle REFUND applied resolution properly', async () => {
                await controller(data);

                const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

                expect(resolvedIncident).to.have.property('status', 'RESOLVED');
                expect(resolvedIncident).to.not.have.property('refundStatus', 'RESOLVED');
                expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'REFUND');
                expect(resolvedIncident).to.have.property('decidedToRefundAt');
                expect(invoke).to.have.be.calledWith('email.send:v1', {
                  from: 'Cubyn <noreply@cubyn.com>',
                  to: 'test@cubyn.com',
                  templateName: 'claim-valid-out-of-stock',
                  language,
                  data: { details: { amount: 150 } }
                });
              });
            });

            describe('when notify thrown an error', () => {
              beforeEach(async () => {
                scubReshipQuantity = 10;
                scubAvailableQuantity = 5;
                await updateConcerns(scubReshipQuantity, scubReshipQuantity);
                data.body.merchandiseValue = 150;
                data.body.shippingFeesAmount = 100;
                messageRepository.claimResolvedOutOfStock = () => {
                  throw new Error('Test');
                };
              });
              it('to throw an error', async () => {
                await expect(controller(data)).to.be.rejectedWith(Error, 'Test');
              });
            });
          });

          describe('when resolutionTypeSelected is REFUND', () => {
            it('should handle REFUND applied resolution properly', async () => {
              await controller(data);

              const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

              expect(resolvedIncident).to.have.property('status', 'RESOLVED');
              expect(resolvedIncident).to.not.have.property('refundStatus', 'RESOLVED');
              expect(resolvedIncident).to.have.property('resolutionTypeApplied', 'REFUND');
              expect(resolvedIncident).to.have.property('decidedToRefundAt');
            });
          });
        });
      });

      describe('when source is NOT RECIPIENT', () => {
        beforeEach(async () => {
          await IncidentModel.query()
            .findById(INCIDENT_ID)
            .update({ source: 'SHIPPER', resolutionTypeSelected: null });
        });

        it('should update incident status and save refund null amounts', async () => {
          await controller(data);

          const resolvedIncident = await IncidentModel.query().findById(INCIDENT_ID);

          expect(resolvedIncident.status).to.eql('RESOLVED');
          expect(resolvedIncident.refundStatus).to.eql(null);
          expect(resolvedIncident.shippingFeesAmount).to.eql(null);
          expect(resolvedIncident.merchandiseValue).to.eql(null);
          expect(resolvedIncident.resolutionTypeSelected).to.eql('REFUND');
          expect(resolvedIncident.resolutionTypeApplied).to.eql('REFUND');
        });

        it('should not send refunds on billing side', async () => {
          await controller(data);

          expect(invoke).to.not.have.been.called;
        });
      });
    });
  });
});
