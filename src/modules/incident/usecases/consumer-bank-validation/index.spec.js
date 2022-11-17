const sinon = require('sinon');
const { expect } = require('chai');
const { ConsumerBankValidation } = require('.');
const { ManualFlowBaseIncident } = require('../../domain/incident/manual-flow-base');
const { MockedLogger } = require('../../../../../tests/logger');
const {
  TransientContextualizedLoggerFactory
} = require('../../../core/adapters/transient-contextualized-logger');
const { BaseIncident } = require('../../domain/incident/base');

describe('usecases/consumer-bank-validation', () => {
  let consumerRefund;
  let incidentRepository;
  let messagingRepository;
  let loggerFactory;
  let filters;
  let result;

  beforeEach(() => {
    incidentRepository = {
      query: sinon.spy(async () => [
        new ManualFlowBaseIncident({
          refundSentXMLEndToEndId: '1'
        }),
        new ManualFlowBaseIncident({
          refundSentXMLEndToEndId: '2'
        })
      ]),
      update: sinon.spy()
    };
    loggerFactory = new TransientContextualizedLoggerFactory({
      context: {},
      innerLogger: new MockedLogger()
    });
    filters = { filters: { endToEndIds: ['1'] } };
    consumerRefund = new ConsumerBankValidation(
      {
        incidentRepository,
        loggerFactory
      },
      filters
    );
    messagingRepository = {
      refundRejected: sinon.spy()
    };
  });

  describe('when there are records refunded', () => {
    beforeEach(async () => {
      result = await consumerRefund.execute();
    });
    it('should have refunds', () => {
      expect(consumerRefund.refunds).to.have.length(2);
    });
    it('should trigger update records', () => {
      expect(consumerRefund.refunds[0].refundStatus).to.be.equal(
        BaseIncident.REFUND_STATUSES.REJECTED
      );
      expect(consumerRefund.refunds[1].refundStatus).to.be.equal(
        BaseIncident.REFUND_STATUSES.RESOLVED
      );
      expect(incidentRepository.update).to.have.been.calledTwice;
      expect(result).to.deep.include({ rejected: 1, resolved: 1 });
    });
  });

  describe('when there are nothing refunded', () => {
    beforeEach(async () => {
      incidentRepository = {
        query: sinon.spy(async () => []),
        update: sinon.spy()
      };
      consumerRefund = new ConsumerBankValidation(
        {
          incidentRepository,
          messagingRepository,
          loggerFactory
        },
        filters
      );
      result = await consumerRefund.execute();
    });
    it('should NOT trigger update records', async () => {
      expect(incidentRepository.update).to.not.have.been.called;
      expect(result).to.deep.include({ resolved: 0, rejected: 0 });
    });
    it('should trigger email to consummer', () => {
      expect(messagingRepository.refundRejected).to.have.been;
    });
  });
});
