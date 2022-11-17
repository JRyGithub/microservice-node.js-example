const builder = require('xmlbuilder');
// eslint-disable-next-line no-unused-vars
const { ManualFlowBaseIncident } = require('../incident/manual-flow-base');
// eslint-disable-next-line no-unused-vars
const { ParcelLateDeliveryIncident } = require('../incident/types/parcel-late-delivery');

class RefundXMLFile {
  constructor({ fileDetails, envHost, messagingRepository, logger }) {
    this.fileDetails = fileDetails;
    this.envHost = envHost;
    this.messagingRepository = messagingRepository;
    this.cubynBankDetails = {
      ES: {
        IBAN: this.envHost.get().BANK_REFUND_LIST_ORG_ES_IBAN.toUpperCase(),
        BIC: this.envHost.get().BANK_REFUND_LIST_ORG_ES_BIC.toUpperCase(),
        Ctry: this.envHost.get().BANK_REFUND_LIST_ORG_ES_CTRY.toUpperCase()
      },
      FR: {
        IBAN: this.envHost.get().BANK_REFUND_LIST_ORG_FR_IBAN.toUpperCase(),
        BIC: this.envHost.get().BANK_REFUND_LIST_ORG_FR_BIC.toUpperCase(),
        Ctry: this.envHost.get().BANK_REFUND_LIST_ORG_FR_CTRY.toUpperCase()
      }
    };
    this.logger = logger;
  }

  /**
   * @param {} data
   */
  // eslint-disable-next-line class-methods-use-this
  xmlRefundsSUM(data) {
    return data.reduce((prev, refund) => prev + refund.merchandiseValue, 0).toFixed(2);
  }

  bankDetails() {
    const { country } = this.fileDetails;
    const details = this.cubynBankDetails[country || 'FR'];

    if (!details) return this.cubynBankDetails.FR;

    return details;
  }

  /**
   * @param {ManualFlowBaseIncident | ParcelLateDeliveryIncident[]} data
   */
  async generateXMLBase64(data) {
    const { dateTime, pmtinfidPostfix } = this.fileDetails;
    const sum = this.xmlRefundsSUM(data);
    const org = this.envHost.get().BANK_REFUND_LIST_ORG_NAME.toUpperCase().replace(/\s/g, '');
    const jsonforXML = {
      Document: {
        '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.001.001.03',
        CstmrCdtTrfInitn: {
          GrpHdr: {
            MsgId: `${org}-${dateTime}`,
            // 2021-10-08T22:31:04
            CreDtTm: new Date().toISOString().split('.')[0],
            NbOfTxs: data.length,
            CtrlSum: sum,
            InitgPty: {
              Nm: org
            }
          },
          PmtInf: {
            PmtInfId: `${org}-${dateTime}-${pmtinfidPostfix}`,
            PmtMtd: this.envHost.get().BANK_REFUND_LIST_ORG_PAYMENT_METHOD,
            NbOfTxs: data.length,
            CtrlSum: sum,
            PmtTpInf: {
              SvcLvl: {
                Cd: this.envHost.get().BANK_REFUND_LIST_ORG_SERVICE_LEVEL
              }
            },
            // 2021-10-08
            ReqdExctnDt: new Date().toISOString().split('T')[0],
            Dbtr: {
              Nm: org,
              PstlAdr: {
                Ctry: this.bankDetails().Ctry
              }
            },
            DbtrAcct: {
              Id: {
                IBAN: this.bankDetails().IBAN.toUpperCase()
              }
            },
            DbtrAgt: {
              FinInstnId: {
                BIC: this.bankDetails().BIC.toUpperCase()
              }
            },
            ChrgBr: this.envHost.get().BANK_REFUND_LIST_ORG_CHARGE_BEARER,
            CdtTrfTxInf: data.map((incident) => incident.consumerRefundXML())
          }
        }
      }
    };

    this.base64 = Buffer.from(builder.create(jsonforXML).end({ pretty: true })).toString('base64');
  }

  getCountryEmail(isoCountryCode) {
    switch (isoCountryCode) {
      case 'FR':
        return this.envHost.get().BANK_REFUND_LIST_SEND_TO_FR;
      case 'ES':
        return this.envHost.get().BANK_REFUND_LIST_SEND_TO_ES;
      default:
        return 'FR';
    }
  }

  async sendToHeadOffice() {
    const { fileName, emailTitle } = this.fileDetails;
    const country = fileName.split('-')[0];
    await this.messagingRepository.financeHeadOfficeNotification({
      to: this.getCountryEmail(country),
      attachments: [
        {
          filename: fileName,
          content: this.base64,
          encoding: 'base64'
        }
      ],
      data: {
        emailTitle
      }
    });
    this.logger.debug(`Refund XML sent ${fileName}`);
  }
}

module.exports = { RefundXMLFile };
