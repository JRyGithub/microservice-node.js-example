/* eslint-disable max-classes-per-file */
const {
  // eslint-disable-next-line no-unused-vars
  TrustpilotInvitationSendContext
} = require('../../domain/trustpilot-invitation-send-context');
const { formatMerchantName } = require('../../domain/trustpilot-invitation/merchant-name');
const { LANGUAGES } = require('./constants/languages');

class InvitationSendResult {
  /**
   * @param {TrustpilotInvitationSendContext} context
   */
  constructor(context) {
    /**
     * @type {TrustpilotInvitationSendContext}
     */
    this.context = context;
  }

  markAsSucceed(response) {
    this.succeed = true;
    this.response = response;

    return this;
  }

  markAsFailed(error) {
    this.succeed = false;
    this.error = error;

    return this;
  }
}

class InvitationSendEngine {
  static get LANGUAGES() {
    return LANGUAGES;
  }

  get languageToTemplateIdMap() {
    return new Map([
      [LANGUAGES.EN, this.envHost.get().TRUSTPILOT_INVITATION_ENGLISH_TEMPLATE_ID],
      [LANGUAGES.FR, this.envHost.get().TRUSTPILOT_INVITATION_FRENCH_TEMPLATE_ID],
      [LANGUAGES.ES, this.envHost.get().TRUSTPILOT_INVITATION_SPANISH_TEMPLATE_ID]
    ]);
  }

  /**
   * @param {Object} param
   * @param {TrustpilotClient} param.trustpilotClient
   * @param {EnvHost} param.envHost
   */
  constructor({ trustpilotClient, envHost, applicationRepository }) {
    this.trustpilotClient = trustpilotClient;
    this.envHost = envHost;
    this.applicationRepository = applicationRepository;
  }

  /**
   * @param {TrustpilotInvitationSendContext[]}
   *
   * @returns {Promise<{
   *   succeed: InvitationSendResult[];
   *   failed: InvitationSendResult[];
   * }>}
   */
  async sendMany(contexts) {
    /**
     * @type {InvitationSendResult}
     */
    const succeed = [];
    /**
     * @type {InvitationSendResult}
     */
    const failed = [];

    await Promise.all(
      contexts.map(async (context) => {
        const result = await this.send(context);

        if (result.succeed) {
          succeed.push(result);
        } else {
          failed.push(result);
        }
      })
    );

    return { succeed, failed };
  }

  async merchantName({ viaApplicationId: applicationId, shipper }) {
    if (!applicationId || !shipper) return '';

    const apps = await this.applicationRepository.findById(applicationId);

    if (!apps.length) return '';

    return formatMerchantName({ app: apps[0], shipper });
  }

  /**
   * @param {TrustpilotInvitationSendContext} context
   * @returns {Promise<InvitationSendResult>}
   */
  async send(context) {
    const result = new InvitationSendResult(context);
    const language = this.resolveLanguage(context);
    const templateId = this.resolveTemplateIdByLanguage(language);
    const merchantName = await this.merchantName(context.parcel);

    try {
      const response = await this.trustpilotClient.sendInvitation(
        context.trustpilotInvitation,
        context.parcel.id,
        { language, templateId },
        merchantName
      );

      return result.markAsSucceed(response);
    } catch (error) {
      return result.markAsFailed(error);
    }
  }

  /**
   * @private
   * @param {TrustpilotInvitationSendContext} context
   * @returns {keyof LANGUAGES}
   */
  resolveLanguage(context) {
    if (!context.parcel || !context.parcel.address) {
      return this.envHost.get().TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE;
    }

    return (
      LANGUAGES[context.parcel.address.country.toUpperCase()] ||
      this.envHost.get().TRUSTPILOT_INVITATION_DEFAULT_LANGUAGE
    );
  }

  /**
   * @private
   * @param {keyof LANGUAGES | void} language
   * @returns {string}
   */
  resolveTemplateIdByLanguage(language) {
    return (
      this.languageToTemplateIdMap.get(language) ||
      this.envHost.get().TRUSTPILOT_INVITATION_DEFAULT_TEMPLATE_ID
    );
  }
}

module.exports = { InvitationSendResult, InvitationSendEngine };
