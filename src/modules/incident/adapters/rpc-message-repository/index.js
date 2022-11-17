const { RESOLUTION_TYPES } = require('../../domain/incident/base');

/**
 * @interface MessageRepository
 */

class RpcMessageRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {object} requester
   * @param {string} requester.email
   * @returns {Promise<void>} id of the refund created
   */
  async claimCreated({ requester }) {
    const language = this.resolveLanguage(requester);

    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'claim-received',
      language
    });
  }

  /**
   * @param {object} requester
   * @param {string} requester.email
   * @param {string} rejectedReason this is a string, but should be parsed to array
   * @returns {Promise<void>} id of the refund created
   */
  async claimRejected({ requester, rejectedReason }) {
    const language = this.resolveLanguage(requester);

    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'claim-rejected',
      language,
      data: {
        rejectedreasons: JSON.parse(rejectedReason)
      }
    });
  }

  /**
   * @param {object} requester
   * @param {string} requester.email
   * @param {'RESHIP' | 'REFUND'} resolutionTypeApplied
   * @returns {Promise<void>} id of the refund created
   */
  async claimResolved(
    { requester, resolutionTypeApplied, merchandiseValue },
    { id, address, deliveredAt },
    products
  ) {
    const language = this.resolveLanguage(requester);

    const details = {};

    if (resolutionTypeApplied === RESOLUTION_TYPES.REFUND) {
      details.amount = merchandiseValue;
    } else {
      details.cubid = id;
      details.address = Object.values(address || {}).join(' ');
      details.deliveryDate = deliveredAt || '';
      details.products = products;
    }
    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'claim-valid-all-set',
      language,
      data: {
        details,
        action: resolutionTypeApplied
      }
    });
  }

  /**
   * @param {object} requester
   * @param {string} requester.email
   * @returns {Promise<void>} id of the refund created
   */
  async claimResolvedLate({ requester, merchandiseValue }) {
    const language = this.resolveLanguage(requester);

    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'claim-valid-late-delivery',
      language,
      data: {
        details: {
          amount: merchandiseValue
        }
      }
    });
  }

  /**
   * @param {object} requester
   * @param {string} requester.email
   * @returns {Promise<void>} id of the refund created
   */
  async claimResolvedOutOfStock({ requester, merchandiseValue }) {
    const language = this.resolveLanguage(requester);

    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'claim-valid-out-of-stock',
      language,
      data: {
        details: {
          amount: merchandiseValue
        }
      }
    });
  }

  async financeHeadOfficeNotification(options) {
    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      templateName: 'finance-refund-notification',
      ...options
    });
  }

  async refundRejected({ requester, createdAt, incidentType, id }) {
    const language = this.resolveLanguage(requester);

    await this.invoke('email.send:v1', {
      from: 'Cubyn <noreply@cubyn.com>',
      to: requester.email,
      templateName: 'refund-rejected',
      language,
      data: {
        createdAt,
        incidentType,
        cubid: id
      }
    });
  }

  /**
   * @private
   * @param {IncidentRequester | void} requester
   * @returns {string | void}
   */
  // eslint-disable-next-line class-methods-use-this
  resolveLanguage(requester) {
    // eslint-disable-next-line no-undefined
    return requester && requester.language ? requester.language : undefined;
  }
}

module.exports = { RpcMessageRepository };
