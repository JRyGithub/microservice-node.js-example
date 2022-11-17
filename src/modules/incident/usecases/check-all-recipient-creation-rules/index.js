const { assert, ResourceNotFoundError } = require('@devcubyn/core.errors');
const { ParcelLateDeliveryIncident } = require('../../domain/incident/types/parcel-late-delivery');
const {
  ParcelMissingProductIncident
} = require('../../domain/incident/types/parcel-missing-product');
const {
  ParcelReceivedDamagedIncident
} = require('../../domain/incident/types/parcel-received-damaged');
const {
  ParcelNeverReceivedIncident
} = require('../../domain/incident/types/parcel-never-received');
const { ConsumerReturnIncident } = require('../../domain/incident/types/consumer-return');
const { INCIDENT_TYPES } = require('../../domain/incident/constants/incident-types');
const { createDenyLog } = require('../../domain/deny-log');
const {
  IncidentCreationContextCompositionEngine
} = require('../../engines/incident-creation-context-composition-engine');
const {
  ConvenientCurrentDateHost
} = require('../../../core/adapters/convenient-current-date-host');

class CheckAllRecipientCreationRulesUsecase {
  /**
   * @param {Object} param
   * @param {ParcelRepository} param.parcelRepository
   * @param {ProductToScubResolveEngine} param.productToScubResolveEngine
   * @param {CreationRulesEngine} param.creationRulesEngine
   */
  constructor({
    parcelRepository,
    productToScubResolveEngine,
    creationRulesEngine,
    incidentRepository,
    shipmentRepository,
    denyLogRepository
  }) {
    this.parcelRepository = parcelRepository;
    this.incidentRepository = incidentRepository;
    this.shipmentRepoistory = shipmentRepository;
    this.productToScubResolveEngine = productToScubResolveEngine;
    this.denyLogRepository = denyLogRepository;
    this.creationRulesEngine = creationRulesEngine;
  }

  async logDenyRule(parcelId, rules, incidentType) {
    if (!incidentType) return;

    const rule = rules[incidentType];

    if (rule.allowed) return;

    const { reason } = rule.error;

    const logRecord = createDenyLog({
      parcelId,
      incidentType,
      reason
    });

    await this.denyLogRepository.create(logRecord);
  }

  async execute({ parcelId, incidentType }) {
    const parcel = await this.parcelRepository.findById({ id: parcelId });
    assert(parcel, ResourceNotFoundError, 'Parcel', parcelId);

    const incidentCreationContext = new IncidentCreationContextCompositionEngine({
      incidentRepository: this.incidentRepository,
      shipmentRepository: this.shipmentRepoistory,
      currentDateHost: new ConvenientCurrentDateHost()
    });

    const [
      contextLateDeliveryResult,
      contextMissingProductResult,
      contextReceivedDamagedResult,
      contextNeverReceivedResult,
      contextReturnResult
    ] = await Promise.all([
      incidentCreationContext.compose({
        parcel,
        incidentType: INCIDENT_TYPES.PARCEL_LATE_DELIVERY
      }),
      incidentCreationContext.compose({
        parcel,
        incidentType: INCIDENT_TYPES.PARCEL_MISSING_PRODUCT
      }),
      incidentCreationContext.compose({
        parcel,
        incidentType: INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED
      }),
      incidentCreationContext.compose({
        parcel,
        incidentType: INCIDENT_TYPES.PARCEL_NEVER_RECEIVED
      }),
      incidentCreationContext.compose({
        parcel,
        incidentType: INCIDENT_TYPES.CONSUMER_RETURN
      })
    ]);

    const [
      parcelLateDeliveryResult,
      parcelMissingProductResult,
      parcelReceivedDamagedResult,
      parcelNeverReceivedResult,
      consumerReturnResult
    ] = await Promise.all([
      this.creationRulesEngine.checkCreationRules({
        context: contextLateDeliveryResult,
        creationRules: ParcelLateDeliveryIncident.getCreationRules()
      }),
      this.creationRulesEngine.checkCreationRules({
        context: contextMissingProductResult,
        creationRules: ParcelMissingProductIncident.getCreationRules()
      }),
      this.creationRulesEngine.checkCreationRules({
        context: contextReceivedDamagedResult,
        creationRules: ParcelReceivedDamagedIncident.getCreationRules()
      }),
      this.creationRulesEngine.checkCreationRules({
        context: contextNeverReceivedResult,
        creationRules: ParcelNeverReceivedIncident.getCreationRules()
      }),
      this.creationRulesEngine.checkCreationRules({
        context: contextReturnResult,
        creationRules: ConsumerReturnIncident.getCreationRules()
      })
    ]);

    const incidentTypeToCheckCreationRulesResultMap = new Map([
      [INCIDENT_TYPES.PARCEL_LATE_DELIVERY, parcelLateDeliveryResult],
      [INCIDENT_TYPES.PARCEL_MISSING_PRODUCT, parcelMissingProductResult],
      [INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED, parcelReceivedDamagedResult],
      [INCIDENT_TYPES.PARCEL_NEVER_RECEIVED, parcelNeverReceivedResult],
      [INCIDENT_TYPES.CONSUMER_RETURN, consumerReturnResult]
    ]);

    await this.logDenyRule(
      parcelId,
      Object.fromEntries(incidentTypeToCheckCreationRulesResultMap),
      incidentType
    );

    return {
      parcel,
      incidentTypeToCheckCreationRulesResultMap
    };
  }
}

module.exports = { CheckAllRecipientCreationRulesUsecase };
