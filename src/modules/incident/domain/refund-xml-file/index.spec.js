const { expect } = require('chai');
const { ManualFlowBaseIncident } = require('../incident/manual-flow-base');
const { RefundXMLFile } = require('.');
const { EnvHost } = require('../../../core/adapters/env-host');
const env = require('../../../../env');
const { INCIDENT_TYPES } = require('../incident');

describe('domain/refund-xml-file', () => {
  let data;
  let envHost;
  let logger;
  let xmlfile;
  let messagingRepository;

  beforeEach(() => {
    envHost = new EnvHost(env);
    data = [
      // merchandiseValue = 6
      INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
      // merchandiseValue = 2.11
      INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED,
      // merchandiseValue = 6
      INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
      // merchandiseValue = 4.11
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
          merchandiseValue: type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY ? 6 : num + 1.11
        })
    );
    xmlfile = new RefundXMLFile({
      messagingRepository,
      envHost,
      logger
    });
  });

  describe('when there are records to refund', () => {
    it('should have correct sum for OTHER refunds', () => {
      expect(
        xmlfile.xmlRefundsSUM(
          data.filter((refund) => refund.type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY)
        )
      ).to.be.equal('12.00');
    });
    it('should have correct sum for OTHER refunds', () => {
      expect(
        xmlfile.xmlRefundsSUM(
          data.filter((refund) => refund.type !== INCIDENT_TYPES.PARCEL_LATE_DELIVERY)
        )
      ).to.be.equal('6.22');
    });
  });
});
