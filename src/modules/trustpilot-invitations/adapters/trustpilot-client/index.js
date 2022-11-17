const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');
const { LANGUAGES } = require('../../engines/invitation-send/constants/languages');
const { SendInvitationError } = require('../../errors');
const { TAGS } = require('./constants/tags');
const { LOCALES } = require('./constants/locales');

class TrustpilotClient {
  static get TAGS() {
    return TAGS;
  }

  static get LOCALES() {
    return LOCALES;
  }

  get languageToLocalesMap() {
    return new Map([
      [LANGUAGES.EN, this.envHost.get().TRUSTPILOT_INVITATION_ENGLISH_LOCALE || LOCALES['en-GB']],
      [LANGUAGES.FR, this.envHost.get().TRUSTPILOT_INVITATION_FRENCH_LOCALE || LOCALES['fr-FR']],
      [LANGUAGES.ES, this.envHost.get().TRUSTPILOT_INVITATION_SPANISH_LOCALE || LOCALES['es-ES']]
    ]);
  }

  /**
   * @param {Object} param
   * @param {TrustpilotAxiosClient} param.trustpilotAxiosClient
   * @param {EnvHost} param.envHost
   */
  constructor({ trustpilotAxiosClient, envHost }) {
    this.trustpilotAxiosClient = trustpilotAxiosClient;
    this.envHost = envHost;
  }

  /**
   * @param {TrustpilotInvitation} tpInvite
   * @param {string} parcelId
   * @param {{language: keyof LANGUAGES, templateId: string}} param0
   */
  async sendInvitation(tpInvite, parcelId, { language, templateId }, merchantName) {
    try {
      const tags = this.createTagsForInvitation(tpInvite);
      const locale = this.resolveLocaleByLanguage(language);

      return await this.trustpilotAxiosClient.post(
        `${this.envHost.get().TRUSTPILOT_INVITATIONS_API_BASE_URL}/v1/private/business-units/${
          this.envHost.get().TRUSTPILOT_BUSINESS_UNIT_ID
        }/email-invitations`,
        {
          referenceNumber: parcelId.toString(),
          consumerName: merchantName,
          consumerEmail: tpInvite.email,
          locale,
          serviceReviewInvitation: {
            templateId,
            redirectUri: this.envHost.get().TRUSTPILOT_INVITATION_REDIRECT_URI,
            tags
          }
        }
      );
    } catch (error) {
      throw new SendInvitationError(error);
    }
  }

  /**
   * @private
   * @param {TrustpilotInvitation} tpInvite
   * @returns {(keyof TAGS)[]}
   */
  // eslint-disable-next-line class-methods-use-this
  createTagsForInvitation(tpInvite) {
    /**
     * @type {(keyof TAGS)[]}
     */
    const tags = [];

    if (tpInvite.entityType === TrustpilotInvitation.ENTITY_TYPES.PARCEL) {
      tags.push(TAGS.FRICTIONLESS_48H);
    }

    return tags;
  }

  /**
   * @private
   * @param {keyof LANGUAGE} language
   * @returns {keyof LOCALES}
   */
  resolveLocaleByLanguage(language) {
    return (
      this.languageToLocalesMap.get(language) ||
      this.envHost.get().TRUSTPILOT_INVITATION_DEFAULT_LOCALE
    );
  }
}

module.exports = { TrustpilotClient };
