const SqlIncidentRepository = require('../../../models/incident');
const { BaseIncident, USER_TYPES } = require('../../domain/incident/base');

class ConsumerBankValidation {
  constructor(
    { incidentRepository = new SqlIncidentRepository(), messagingRepository } = {},
    { filters }
  ) {
    this.filters = filters;
    this.refunds = [];
    this.incidentRepository = incidentRepository;
    // kept for notifications
    this.messagingRepository = messagingRepository;
  }

  async prepare() {
    const { endToEndIds } = this.filters;
    const rejectedIds = Array.isArray(endToEndIds) ? endToEndIds : [endToEndIds];
    this.refunds = await this.incidentRepository.query({
      refundStatus: BaseIncident.REFUND_STATUSES.STARTED,
      status: BaseIncident.STATUSES.RESOLVED,
      source: USER_TYPES.RECIPIENT
    });

    this.refunds = this.refunds.map((incident) => {
      let status = BaseIncident.REFUND_STATUSES.RESOLVED;

      if (rejectedIds.includes(incident.refundSentXMLEndToEndId)) {
        status = BaseIncident.REFUND_STATUSES.REJECTED;
      }
      incident.updateRefundStatus(status);

      return incident;
    });
  }

  async updateRecords() {
    for (const refund of this.refunds) {
      await this.incidentRepository.update(refund);
    }
  }

  async execute() {
    await this.prepare();
    if (this.refunds.length === 0) {
      return {
        rejected: 0,
        resolved: 0
      };
    }

    await this.updateRecords();

    return {
      rejected: this.refunds.filter(
        (incident) => incident.refundStatus === BaseIncident.REFUND_STATUSES.REJECTED
      ).length,
      resolved: this.refunds.filter(
        (incident) => incident.refundStatus === BaseIncident.REFUND_STATUSES.RESOLVED
      ).length
    };
  }

  async notify() {
    await Promise.all(
      this.refunds
        .filter((refund) => refund.refundStatus === BaseIncident.REFUND_STATUSES.REJECTED)
        .map((refund) =>
          this.messagingRepository.refundRejected({
            requester: refund.requester,
            createdAt: refund.createdAt,
            incidentType: refund.type,
            id: refund.entityId
          })
        )
    );
  }
}

module.exports = { ConsumerBankValidation };
