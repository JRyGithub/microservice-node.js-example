const sinon = require('sinon');
const { expect } = require('chai');
const { ExportConsumerRefundList } = require('.');
const { ManualFlowBaseIncident } = require('../../domain/incident/manual-flow-base');
const { EnvHost } = require('../../../core/adapters/env-host');
const { buildEnv } = require('../../../../../tests/env');
const { MockedLogger } = require('../../../../../tests/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const { INCIDENT_TYPES } = require('../../domain/incident');

describe('usecases/send-consumer-refund', () => {
  let consumerRefund;
  let incidentRepository;
  let messagingRepository;
  let warehouseRepository;
  let parcelRepository;
  let envHost;
  let loggerFactory;
  let filters;
  let docs;

  beforeEach(() => {
    incidentRepository = {
      query: sinon.spy(async () =>
        [
          INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
          INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
          INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
          INCIDENT_TYPES.PARCEL_MISSING_PRODUCT
        ].map(
          (type, num) =>
            new ManualFlowBaseIncident({
              type,
              entityId: `p${num}`,
              entityType: 'PARCEL',
              requester: {
                bankInfo: {
                  firstName: `first ${num}`,
                  lastName: `last ${num}`,
                  email: `a${num}@b.c`,
                  bic: `1 ${num}`,
                  iban: `2 ${num}`
                }
              },
              merchandiseValue: type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY ? null : num + 1
            })
        )
      ),
      lastRefundSent: sinon.spy(
        async () =>
          new ManualFlowBaseIncident({
            refundSentToHeadOfFinanceAt: new Date()
          })
      ),
      bulkupdate: sinon.spy()
    };
    messagingRepository = {
      financeHeadOfficeNotification: sinon.spy()
    };
    parcelRepository = {
      findByIds: sinon.spy(() => [
        {
          id: 'p0',
          warehouseId: 'wh1'
        },
        {
          id: 'p1',
          warehouseId: 'wh1'
        },
        {
          id: 'p2',
          warehouseId: 'wh2'
        },
        {
          id: 'p3',
          warehouseId: 'wh2'
        }
      ])
    };
    warehouseRepository = {
      fetchByIdsWithAddress: sinon.spy(() => [
        {
          id: 'wh1',
          address: {
            country: 'FR'
          }
        },
        {
          id: 'wh2',
          address: {
            country: 'ES'
          }
        }
      ])
    };
    const env = buildEnv({
      BANK_REFUND_LIST_SEND_TO_FR: 'fr@cub.com',
      BANK_REFUND_LIST_SEND_TO_ES: 'es@cub.com'
    });
    envHost = new EnvHost(env);
    loggerFactory = new TransientContextualizedLoggerFactory({
      context: {},
      innerLogger: new MockedLogger()
    });
    filters = { type: [] };
    consumerRefund = new ExportConsumerRefundList(
      {
        incidentRepository,
        warehouseRepository,
        parcelRepository,
        messagingRepository,
        envHost,
        loggerFactory
      },
      filters
    );
  });

  describe('when there are records to refund', () => {
    beforeEach(async () => {
      docs = await consumerRefund.execute();
      for (const doc of docs) {
        await doc.sendToHeadOffice();
      }
    });
    it('should have refunds', () => {
      expect(consumerRefund.refunds).to.have.length(4);
    });
    it('should trigger email to finance head', () => {
      // FR, ES (LATE) ; FR, ES (CLAIMS)
      expect(messagingRepository.financeHeadOfficeNotification).to.have.been.callCount(4);
    });
    it('should trigger update records', () => {
      expect(
        consumerRefund.refunds.every((refund) => {
          return (
            refund.refundStatus === ManualFlowBaseIncident.REFUND_STATUSES.STARTED &&
            !!refund.refundSentToHeadOfFinanceAt &&
            !!refund.refundSentXMLEndToEndId
          );
        })
      ).to.be.true;

      expect(incidentRepository.bulkupdate).to.have.been.callCount(4);
    });

    it('should have unique refundSentXMLEndToEndId', () => {
      const uniqueCheck = consumerRefund.refunds;
      expect(
        new Set(uniqueCheck.map((refund) => refund.refundSentXMLEndToEndId)).size ===
          uniqueCheck.length
      ).to.be.true;
    });
    it('should have base64 generated', () => {
      const base64RegExp = new RegExp(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
      );

      for (const doc of docs) {
        expect(base64RegExp.test(doc.base64)).to.be.true;
      }
    });
    it('should not have undefined in title', () => {
      for (const doc of docs) {
        expect(doc.fileDetails.fileName.includes('undefined')).to.be.false;
        expect(doc.fileDetails.emailTitle.includes('undefined')).to.be.false;
      }
    });
  });

  describe('when there are nothing to refund', () => {
    beforeEach(async () => {
      incidentRepository = {
        query: sinon.spy(async () => []),
        bulkupdate: sinon.spy()
      };
      consumerRefund = new ExportConsumerRefundList(
        {
          incidentRepository,
          messagingRepository,
          parcelRepository,
          warehouseRepository,
          envHost,
          loggerFactory
        },
        filters
      );
      docs = await consumerRefund.execute();
      for (const doc of docs) {
        await doc.sendToHeadOffice();
      }
    });
    it('should NOT trigger email to finance head', async () => {
      expect(messagingRepository.financeHeadOfficeNotification).to.not.have.been.called;
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.bulkupdate).to.not.have.been.called;
    });
  });

  describe('when there are only France parcels', () => {
    beforeEach(async () => {
      incidentRepository = {
        query: sinon.spy(async () =>
          [INCIDENT_TYPES.PARCEL_LATE_DELIVERY, INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED].map(
            (type, num) =>
              new ManualFlowBaseIncident({
                type,
                entityId: `p${num}`,
                entityType: 'PARCEL',
                requester: {
                  bankInfo: {
                    firstName: `first ${num}`,
                    lastName: `last ${num}`,
                    email: `a${num}@b.c`,
                    bic: `1 ${num}`,
                    iban: `2 ${num}`
                  }
                },
                merchandiseValue: type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY ? null : num + 1
              })
          )
        ),
        lastRefundSent: sinon.spy(
          async () =>
            new ManualFlowBaseIncident({
              refundSentToHeadOfFinanceAt: new Date()
            })
        ),
        bulkupdate: sinon.spy()
      };
      parcelRepository = {
        findByIds: sinon.spy(() => [
          {
            id: 'p0',
            warehouseId: 'wh1'
          },
          {
            id: 'p1',
            warehouseId: 'wh1'
          }
        ])
      };
      consumerRefund = new ExportConsumerRefundList(
        {
          incidentRepository,
          warehouseRepository,
          parcelRepository,
          messagingRepository,
          envHost,
          loggerFactory
        },
        filters
      );
      docs = await consumerRefund.execute();
      for (const doc of docs) {
        await doc.sendToHeadOffice();
      }
    });
    it('should trigger email to finance head', () => {
      expect(messagingRepository.financeHeadOfficeNotification).to.have.been.calledWith(
        sinon.match({
          to: 'fr@cub.com'
        })
      );
      expect(messagingRepository.financeHeadOfficeNotification).to.have.not.been.calledWith(
        sinon.match({
          to: 'es@cub.com'
        })
      );
    });
  });
});
