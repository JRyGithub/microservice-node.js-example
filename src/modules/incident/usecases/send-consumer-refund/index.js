/* eslint-disable max-classes-per-file */
const SqlIncidentRepository = require('../../../models/incident');
const { INCIDENT_TYPES, INCIDENT_ENTITY_TYPES } = require('../../domain/incident');
const { BaseIncident } = require('../../domain/incident/base');
const { RefundXMLFile } = require('../../domain/refund-xml-file');

class ExportDocumentRules {
  constructor({ name, fileName, filterCb, emailfilterCb, incidentRepository }) {
    this.dateTime = new Date().toISOString().split('.')[0].replace(/T|-|:/g, '');
    this.name = name;
    this.fileName = `${fileName}-${this.dateTime}`;
    this.emailTitle = async () =>
      this.generateEmailTitle({
        filter: emailfilterCb,
        name: this.name
      });
    this.filter = filterCb;
    this.incidentRepository = incidentRepository;
  }

  async generateEmailTitle({ filter, name }) {
    const { refundSentToHeadOfFinanceAt } = await this.incidentRepository.lastRefundSent({
      ...this.filters,
      type: Object.keys(INCIDENT_TYPES).filter(filter),
      refundNotGenerated: false
    });
    const from = new Date(refundSentToHeadOfFinanceAt)
      .toISOString()
      .split('.')[0]
      .replace(/T/g, ' ');
    // eslint-disable-next-line id-length
    const to = new Date().toISOString().split('.')[0].replace(/T/g, ' ');

    return `${name}S from ${from} to ${to}`;
  }
}

class ExportConsumerRefundList {
  constructor(
    {
      incidentRepository = new SqlIncidentRepository(),
      messagingRepository,
      parcelRepository,
      warehouseRepository,
      envHost,
      loggerFactory
    } = {},
    filters
  ) {
    this.dateTime = () => new Date().toISOString().split('.')[0].replace(/T|-|:/g, '');
    this.docs = [
      new ExportDocumentRules({
        name: 'CLAIM',
        fileName: 'CLAIM_CONSUMER_REFUNDS',
        filterCb: (refund) => refund.type !== INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
        emailfilterCb: (incident) => incident !== INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
        incidentRepository
      }),
      new ExportDocumentRules({
        name: 'LATE',
        fileName: 'LATE_CONSUMER_COMPENSTATION',
        filterCb: (refund) => refund.type === INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
        emailfilterCb: (incident) => incident === INCIDENT_TYPES.PARCEL_LATE_DELIVERY,
        incidentRepository
      })
    ];
    this.filters = filters;
    this.refunds = [];
    this.incidentRepository = incidentRepository;
    this.parcelRepository = parcelRepository;
    this.warehouseRepository = warehouseRepository;
    this.messagingRepository = messagingRepository;
    this.envHost = envHost;
    this.logger = loggerFactory.create('ExportConsumerRefundList');
  }

  async prepare() {
    this.refunds = await this.incidentRepository.query(this.filters, {
      includes: ['requester']
    });
    const missingRequesters = this.refunds.filter(
      (incident) => !incident.requester || !incident.requester.bankInfo
    );

    if (missingRequesters.length > 0) {
      this.logger.debug(
        `There are requesters || bankInfo missing for ${missingRequesters.length} incidents`
      );
      this.refunds = this.refunds.filter((incident) => incident.requester && incident.bankInfo);
    }

    const groupedParcelIds = this.refunds.reduce(
      (prev, refund) =>
        prev.includes(refund.entityId) && refund.entityType === INCIDENT_ENTITY_TYPES.PARCEL
          ? prev
          : [...prev, refund.entityId],
      []
    );

    const parcels = await this.parcelRepository.findByIds({
      ids: groupedParcelIds,
      includes: ['parcel.admin', 'parcel.pii']
    });

    const groupedWarehouseIds = parcels.reduce(
      (prev, parcel) =>
        prev.includes(parcel.warehouseId) && parcel.warehouseId
          ? prev
          : [...prev, parcel.warehouseId],
      []
    );

    const warehouses = await this.warehouseRepository.fetchByIdsWithAddress({
      ids: groupedWarehouseIds,
      includes: ['address']
    });

    this.refunds = this.refunds.map((refund) => {
      const parcel = parcels.find((prcl) => prcl.id.toString() === refund.entityId);

      // default warehouse country
      // eslint-disable-next-line no-param-reassign
      refund.warehouseCountry = 'FR';

      if (!parcel) return refund;
      const warehouse = warehouses.find((whs) => whs.id === parcel.warehouseId);

      if (!warehouse) return refund;
      const { address } = warehouse;

      if (!address) return refund;

      const { country = 'FR' } = address;

      // eslint-disable-next-line no-param-reassign
      refund.warehouseCountry = country;

      return refund;
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async markRecordsAsUpdated({ dateTime, docNumber, list }) {
    return list.map((incident, index) => {
      incident.updateRefundStatus(BaseIncident.REFUND_STATUSES.STARTED);
      incident.setRefundSentToHeadOfFinanceAt();
      incident.setRefundSentXMLEndToEnd({ dateTime, docNumber, index });

      return incident;
    });
  }

  async updateSentRecords(list) {
    await this.incidentRepository.bulkupdate(list);
    this.logger.debug(`Refunds updated ${list.length} records`);
  }

  /**
   * @returns {Promise<Array<RefundXMLFile>>}
   */
  async execute() {
    await this.prepare();

    if (this.refunds.length === 0) {
      this.logger.debug('There are no refunds incidents to send');

      return [];
    }

    const refundDocs = [];

    for (const doc of this.docs) {
      const list = this.refunds.filter(doc.filter);

      if (list.length) {
        const countries = this.refunds
          .filter(doc.filter)
          .reduce(
            (prev, refund) =>
              prev.includes(refund.warehouseCountry) ? prev : [...prev, refund.warehouseCountry],
            []
          );

        for (const country of countries) {
          const countryList = list.filter((refund) => refund.warehouseCountry === country);
          // we have to do it before this loop to populate XMLEndToEndId
          await this.markRecordsAsUpdated({
            dateTime: doc.dateTime,
            docNumber: refundDocs.length,
            list: countryList
          });
          const refundDoc = new RefundXMLFile({
            messagingRepository: this.messagingRepository,
            envHost: this.envHost,
            logger: this.logger,
            countryList,
            fileDetails: {
              fileName: `${country}-${doc.fileName}.xml`,
              emailTitle: await doc.emailTitle(),
              dateTime: doc.dateTime,
              pmtinfidPostfix: `${doc.name}-${country}`,
              country
            }
          });
          refundDoc.generateXMLBase64(countryList);
          refundDocs.push(refundDoc);
          await this.updateSentRecords(countryList);
        }
      }
    }

    return refundDocs;
  }
}

module.exports = { ExportConsumerRefundList };
