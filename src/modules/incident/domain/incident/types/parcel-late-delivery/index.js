const {
  CountryNotEligible,
  BeingResolved,
  AlreadyResolved,
  DeliveredOnTime,
  StillOnTime
} = require('../../../creation-rule');
const { INCIDENT_TYPES } = require('../../constants/incident-types');
const { ManualFlowBaseIncident } = require('../../manual-flow-base');

/**
 * "Parcel late delivery" incident
 *
 * That incident does not trigger any document validation
 */
class ParcelLateDeliveryIncident extends ManualFlowBaseIncident {
  constructor(values) {
    // eslint-disable-next-line no-param-reassign
    values.type = INCIDENT_TYPES.PARCEL_LATE_DELIVERY;
    super(values);
  }

  static getCreationRules() {
    return [
      new CountryNotEligible(),
      new BeingResolved(),
      new AlreadyResolved(),
      new StillOnTime(),
      new DeliveredOnTime()
    ];
  }

  /**
   * Manually resolve incident
   * Forbidden by default, unless overriden by incident's child class
   *
   *
   * @param {'RESHIP' | 'REFUND'} appliedResolution
   */
  forceResolve({ appliedResolution = null, recipientCountry }) {
    this.status = ManualFlowBaseIncident.STATUSES.RESOLVED;

    if (recipientCountry === 'ES') this.merchandiseValue = 5;
    else this.merchandiseValue = 6;
    if (!this.isRecipientSource()) {
      this.updateRefundStatus(ManualFlowBaseIncident.REFUND_STATUSES.RESOLVED);
    }
    this.setAppliedResolutionType(appliedResolution);
  }
}

module.exports = { ParcelLateDeliveryIncident };
