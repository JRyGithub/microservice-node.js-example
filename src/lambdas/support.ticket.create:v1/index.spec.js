const sinon = require('sinon');
const { expect } = require('chai');
const { BadRequestError } = require('@devcubyn/core.errors');
const zendeskTicket = require('../../drivers/zendesk/ticket');
const { TYPES, TICKET_REASON_TYPES } = require('../../modules/models/entity-type/constants');
const IncidentModel = require('../../modules/models/incident');
const { INCIDENT_TYPES } = require('../../modules/incident/domain/incident');
const { handler: lambda } = require('.');
const {
  USER_FIXTURE,
  PARCEL_FIXTURE,
  COLLECT_FIXTURE,
  ATTACHMENTS_FIXTURE,
  PRODUCTS_SCUBS,
  USER_PID,
  TICKET_FIXTURE,
  PARCEL_PID,
  ATTACHMENT_MAPPING,
  PRODUCTS,
  BUNDLE_PRODUCT,
  BUNDLE_PRODUCTS_SCUBS,
  ITEMS_FIXTURE,
  INVOICE,
  GENERAL_DATA,
  PARCEL_EVENTS,
  USER_SETTING_FIXTURE
} = require('./fixture');
const { WIO, WIO_DELIVERIES } = require('../../../tests/fixtures/wio');

describe('lambdas/support.ticket.create:v1', () => {
  const store = {};

  afterEach(async () => {
    await IncidentModel.query().delete();
  });

  describe('When creating an order ticket', () => {
    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      store.invoke = sinon.spy((qualifier) => {
        switch (qualifier) {
          case 'user.read:v1': {
            return USER_FIXTURE;
          }
          case 'parcel.read:v1': {
            return { ...PARCEL_FIXTURE };
          }
          case 'collect.read:v1': {
            return COLLECT_FIXTURE;
          }
          case 'attachment.list:v1': {
            return ATTACHMENTS_FIXTURE;
          }
          case 'product-catalog__product.list:v1': {
            return PRODUCTS;
          }
          case 'product-catalog__product-scub.list:v1': {
            return PRODUCTS_SCUBS;
          }
          case 'parcel-event.list:v1': {
            return PARCEL_EVENTS;
          }
          case 'user-setting.list:v1': {
            return USER_SETTING_FIXTURE;
          }
          default: {
            return true;
          }
        }
      });
    });

    afterEach(() => zendeskTicket.create.restore());

    it('should retrieve parcel data', async () => {
      const publishSpy = sinon.spy();
      const request = {
        data: {
          userId: USER_PID,
          referenceId: PARCEL_PID,
          ticket: TICKET_FIXTURE,
          type: TYPES.ORDER
        },
        invoke: store.invoke,
        publish: publishSpy
      };

      const entityDataResult = {
        ...PARCEL_FIXTURE,
        deliveredAt: 'Tue Oct 04 2016 21:47:26 GMT+0200 (CEST)',
        cancelledAt: 'Tue Oct 04 2020 22:30:26 GMT+0200 (CEST)',
        attachments: ATTACHMENT_MAPPING,
        lastEventMessage: 'woop woop',
        totalWeight: 72,
        collectId: null
      };

      await lambda(request);

      expect(request.invoke.called).to.be.true;
      expect(zendeskTicket.create.calledOnce).to.be.true;
      expect(zendeskTicket.create.args[0][0].ticket).to.deep.equal(TICKET_FIXTURE);
      expect(zendeskTicket.create.args[0][0].user).to.deep.equal(USER_FIXTURE);
      expect(zendeskTicket.create.args[0][0].data).to.deep.equal(entityDataResult);
      expect(zendeskTicket.create.args[0][0].generalData).to.deep.equal({
        ...GENERAL_DATA,
        ticketType: TYPES.ORDER
      });
    });
  });

  describe('When creating a SKU ticket', () => {
    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      store.invoke = sinon.spy((qualifier) => {
        switch (qualifier) {
          case 'user.read:v1': {
            return USER_FIXTURE;
          }
          case 'product-catalog__product-scub.list:v1': {
            return BUNDLE_PRODUCTS_SCUBS;
          }
          case 'item.list:v1': {
            return ITEMS_FIXTURE;
          }
          case 'user-setting.list:v1': {
            return USER_SETTING_FIXTURE;
          }
          default: {
            return true;
          }
        }
      });
    });

    afterEach(() => zendeskTicket.create.restore());

    it('should retrieve related scub quantities', async () => {
      const publishSpy = sinon.spy();
      const skuDataResult = {
        id: 1,
        quantityPerStatus: {
          name: BUNDLE_PRODUCT.name,
          sku: BUNDLE_PRODUCT.sku,
          isBundle: BUNDLE_PRODUCT.isBundle,
          quantities: [
            { scubId: 1, STORED: 1, MISSING: 1 },
            { scubId: 2, STORED: 1 }
          ]
        }
      };
      const request = {
        data: {
          userId: USER_PID,
          referenceId: BUNDLE_PRODUCTS_SCUBS[0].product.id,
          ticket: TICKET_FIXTURE,
          type: TYPES.SKU
        },
        invoke: store.invoke,
        publish: publishSpy
      };
      await lambda(request);
      expect(request.invoke.called).to.be.true;
      expect(zendeskTicket.create.calledOnce).to.be.true;
      expect(zendeskTicket.create.args[0][0].ticket).to.deep.equal(TICKET_FIXTURE);
      expect(zendeskTicket.create.args[0][0].user).to.deep.equal(USER_FIXTURE);
      expect(zendeskTicket.create.args[0][0].data).to.deep.equal(skuDataResult);
      expect(zendeskTicket.create.args[0][0].generalData).to.deep.equal({
        ...GENERAL_DATA,
        ticketType: TYPES.SKU
      });
    });
  });

  describe('When creating an invoice ticket', () => {
    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      store.invoke = sinon.spy((qualifier) => {
        switch (qualifier) {
          case 'user.read:v1': {
            return USER_FIXTURE;
          }
          case 'invoice.read:v1': {
            return INVOICE;
          }
          case 'user-setting.list:v1': {
            return USER_SETTING_FIXTURE;
          }
          default: {
            return true;
          }
        }
      });
    });

    afterEach(() => zendeskTicket.create.restore());

    it('should retrieve invoice data', async () => {
      const publishSpy = sinon.spy();
      const request = {
        data: {
          userId: USER_PID,
          referenceId: INVOICE.id,
          ticket: TICKET_FIXTURE,
          type: TYPES.INVOICE
        },
        invoke: store.invoke,
        publish: publishSpy
      };
      await lambda(request);
      expect(request.invoke.called).to.be.true;
      expect(zendeskTicket.create.calledOnce).to.be.true;
      expect(zendeskTicket.create.args[0][0].ticket).to.deep.equal(TICKET_FIXTURE);
      expect(zendeskTicket.create.args[0][0].user).to.deep.equal(USER_FIXTURE);
      expect(zendeskTicket.create.args[0][0].data).to.deep.equal(INVOICE);
      expect(zendeskTicket.create.args[0][0].generalData).to.deep.equal({
        ...GENERAL_DATA,
        ticketType: TYPES.INVOICE
      });
    });
  });

  describe('when creating a WIO ticket', () => {
    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      store.invoke = sinon.spy((qualifier) => {
        switch (qualifier) {
          case 'user.read:v1': {
            return USER_FIXTURE;
          }
          case 'storage-inbound__order.list:v1': {
            return [WIO];
          }
          case 'user-setting.list:v1': {
            return USER_SETTING_FIXTURE;
          }
          case 'storage-inbound__delivery.list:v1': {
            return WIO_DELIVERIES;
          }
          default: {
            return true;
          }
        }
      });
    });

    afterEach(() => zendeskTicket.create.restore());

    it('should retrieve WIO data', async () => {
      const publishSpy = sinon.spy();
      const request = {
        data: {
          userId: USER_PID,
          referenceId: WIO.id,
          ticket: TICKET_FIXTURE,
          type: TYPES.WIO
        },
        invoke: store.invoke,
        publish: publishSpy
      };
      await lambda(request);
      expect(request.invoke.called).to.be.true;
      expect(zendeskTicket.create.calledOnce).to.be.true;
      expect(zendeskTicket.create.args[0][0].ticket).to.deep.equal(TICKET_FIXTURE);
      expect(zendeskTicket.create.args[0][0].user).to.deep.equal(USER_FIXTURE);
      expect(zendeskTicket.create.args[0][0].data).to.deep.equal(WIO);
      expect(zendeskTicket.create.args[0][0].data.deliveries).to.deep.equal(WIO_DELIVERIES);
      expect(zendeskTicket.create.args[0][0].generalData).to.deep.equal({
        ...GENERAL_DATA,
        ticketType: TYPES.WIO
      });
    });
  });

  describe('incident creation', () => {
    let productRepository;
    let itemRepository;
    let documentValidationRepository;
    let dependencies;
    let publishSpy;

    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      store.invoke = sinon.spy((qualifier) => {
        switch (qualifier) {
          case 'user.read:v1': {
            return USER_FIXTURE;
          }
          case 'storage-inbound__order.list:v1': {
            return [WIO];
          }
          case 'user-setting.list:v1': {
            return USER_SETTING_FIXTURE;
          }
          case 'storage-inbound__delivery.list:v1': {
            return WIO_DELIVERIES;
          }
          default: {
            return true;
          }
        }
      });

      documentValidationRepository = {
        validate: sinon.spy(() => ({ id: 'DOCUMENT_VALIDATION_ID' }))
      };
      productRepository = {
        findById: sinon.spy(() => ({
          sku: 'SKU',
          name: 'my sku',
          ownerId: USER_PID,
          scubId: 'SCUB-001',
          children: [
            {
              sku: 'SKU_DAMAGED',
              name: 'my sku',
              flag: 'DAMAGED',
              ownerId: USER_PID,
              scubId: 'SCUB-002'
            }
          ]
        }))
      };
      itemRepository = {
        getItemsDamagedAfter: sinon.spy(async () => ['ITEM-001'])
      };
      dependencies = {
        documentValidationRepository,
        productRepository,
        itemRepository
      };
      publishSpy = sinon.spy();
    });

    afterEach(() => zendeskTicket.create.restore());

    describe('when reason is PRODUCT_DAMAGED_IN_WAREHOUSE', () => {
      let request;

      beforeEach(() => {
        request = {
          data: {
            userId: USER_PID,
            referenceId: WIO.id,
            ticket: {
              ...TICKET_FIXTURE,
              reasonType: TICKET_REASON_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
              fileMap: {
                BUYING_INVOICE: [{ fileKey: 's3://invoice.pdf' }]
              }
            },
            type: TYPES.WIO
          },
          invoke: store.invoke,
          publish: publishSpy
        };
      });

      it('should create a new incident', async () => {
        const result = await lambda(request, dependencies);

        // incident should have been created in local db
        const incidents = await IncidentModel.query().eager('[attachments, concerns]');
        expect(incidents).to.have.length(1);
        const [incident] = incidents;
        expect(incident.type).to.eql(INCIDENT_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE);
        expect(incident.attachments).to.have.length(1);
        expect(incident.concerns).to.have.length(1);
        expect(result).to.have.property('id');

        // document validation should have been requested
        expect(documentValidationRepository.validate.calledOnce).to.be.true;
        expect(productRepository.findById.called).to.be.true;

        expect(zendeskTicket.create.calledOnce).to.be.false;
      });
    });

    describe('when reason is PRODUCT_LOST_IN_WAREHOUSE (non-claim reason)', () => {
      let request;
      beforeEach(() => {
        request = {
          data: {
            userId: USER_PID,
            referenceId: WIO.id,
            ticket: {
              ...TICKET_FIXTURE,
              reasonType: TICKET_REASON_TYPES.PRODUCT_LOST_IN_WAREHOUSE,
              fileMap: {
                BUYING_INVOICE: [{ fileKey: 's3://invoice.pdf' }]
              }
            },
            type: TYPES.WIO
          },
          invoke: store.invoke,
          publish: publishSpy
        };
      });

      it('should create zendesk ticket ', async () => {
        await lambda(request);
        expect(zendeskTicket.create.calledOnce).to.be.true;
        // should not create incident
        const incidents = await IncidentModel.query();
        expect(incidents).to.have.length(0);
      });
    });

    describe('when reason is WIO_OTHER (non-claim reason)', () => {
      let request;
      beforeEach(() => {
        request = {
          data: {
            userId: USER_PID,
            referenceId: WIO.id,
            ticket: {
              ...TICKET_FIXTURE,
              reasonType: TICKET_REASON_TYPES.WIO_OTHER
            },
            type: TYPES.WIO
          },
          invoke: store.invoke,
          publish: publishSpy
        };
      });

      it('should create a zendesk ticket', async () => {
        await lambda(request);
        expect(zendeskTicket.create.calledOnce).to.be.true;
      });

      it('should not create a new incident', async () => {
        await lambda(request);
        const incidents = await IncidentModel.query();
        expect(incidents).to.have.length(0);
      });

      it('should not create a zendesk ticket and incident for is dry run', async () => {
        request.data.isDryRun = true;
        await expect(lambda(request, { productRepository, itemRepository })).to.be.rejectedWith(
          BadRequestError,
          /No dry-run/
        );
        expect(zendeskTicket.create.calledOnce).to.be.false;
        const incidents = await IncidentModel.query();
        expect(incidents).to.have.length(0);
      });
    });
  });

  describe('incident preprocessing', () => {
    let productRepository;
    let itemRepository;

    beforeEach(() => {
      sinon.stub(zendeskTicket, 'create').returns({ id: 1 });
      productRepository = {
        findById: sinon.spy(() => ({
          sku: 'SKU',
          name: 'my sku',
          ownerId: USER_PID,
          scubId: 'SCUB-001',
          children: [
            {
              sku: 'SKU_DAMAGED',
              name: 'my sku',
              flag: 'DAMAGED',
              ownerId: USER_PID,
              scubId: 'SCUB-002'
            }
          ]
        }))
      };
      itemRepository = {
        getItemsDamagedAfter: sinon.spy(async () => ['ITEM-001'])
      };
    });

    afterEach(() => zendeskTicket.create.restore());

    it('should preprocess incident when isDryRun enabled', async () => {
      const request = {
        data: {
          userId: USER_PID,
          referenceId: WIO.id,
          ticket: {
            ...TICKET_FIXTURE,
            reasonType: TICKET_REASON_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
            fileMap: {
              BUYING_INVOICE: [{ fileKey: 's3://invoice.pdf' }]
            }
          },
          type: TYPES.WIO,
          isDryRun: true
        }
      };
      const result = await lambda(request, { productRepository, itemRepository });

      expect(result.success).to.be.true;

      // no incident should have been created
      const incidents = await IncidentModel.query();
      expect(incidents).to.have.length(0);

      // document validation should have been requested
      expect(productRepository.findById.called).to.be.true;
    });

    it('should not create a zendesk ticket', async () => {
      const request = {
        data: {
          userId: USER_PID,
          referenceId: WIO.id,
          ticket: {
            ...TICKET_FIXTURE,
            reasonType: TICKET_REASON_TYPES.PRODUCT_DAMAGED_IN_WAREHOUSE,
            fileMap: {
              BUYING_INVOICE: [{ fileKey: 's3://invoice.pdf' }]
            }
          },
          type: TYPES.WIO,
          isDryRun: true
        },
        invoke: store.invoke
      };
      await lambda(request, { productRepository, itemRepository });
      expect(zendeskTicket.create.calledOnce).to.be.false;
    });

    it('should reject preprocessing unsupported reasons', async () => {
      const request = {
        data: {
          userId: USER_PID,
          referenceId: WIO.id,
          ticket: {
            ...TICKET_FIXTURE,
            reasonType: TICKET_REASON_TYPES.WIO_OTHER
          },
          type: TYPES.WIO,
          isDryRun: true
        }
      };

      await expect(lambda(request, { productRepository, itemRepository })).to.be.rejectedWith(
        BadRequestError,
        /No dry-run/
      );
    });
  });
});
