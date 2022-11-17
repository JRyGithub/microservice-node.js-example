class TrustpilotInvitationCancelComputationContext {
  /**
   * @param {Object} param
   * @param {import('../trustpilot-invitation').TrustpilotInvitation} param.trustpilotInvitation
   * @param {Parcel} param.parcel
   * @param {Shipper} param.shipper
   * @param {IncidentRequester | void} param.incidentRequester
   */
  constructor({ trustpilotInvitation, parcel, shipper, incidentRequester }) {
    /**
     * @type {import('../trustpilot-invitation').TrustpilotInvitation}
     */
    this.trustpilotInvitation = trustpilotInvitation;
    /**
     * @type {Parcel}
     */
    this.parcel = parcel;
    /**
     * @type {Shipper}
     */
    this.shipper = shipper;
    /**
     * @type {IncidentRequester | void}
     */
    this.incidentRequester = incidentRequester;
  }
}

module.exports = { TrustpilotInvitationCancelComputationContext };
