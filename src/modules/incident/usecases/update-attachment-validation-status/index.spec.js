const sinon = require('sinon');
const { expect } = require('chai');
const { ResourceNotFoundError, InvalidAttachmentValidationPayloadError } = require('../../errors');
const { updateAttachmentValidationStatusUsecase: usecase } = require('.');
const {
  ProductDamagedInWarehouseIncident
} = require('../../domain/incident/types/product-damaged-in-warehouse');
const { Concern } = require('../../domain/concern');
const { AttachmentValidation } = require('../../domain/attachment-validation');
const FIXTURES = require('../../../../../tests/fixtures/incidents/product-damaged-in-warehouse');
const {
  BUYING_INVOICE_PAYLOAD,
  COMMERCIAL_INVOICE_PAYLOAD,
  IDENTIFICATION_DOCUMENT_PAYLOAD,
  AFFIDAVIT_PAYLOAD,
  POLICE_REPORT_PAYLOAD
} = require('../../../../../tests/fixtures/attachments');

const { INCIDENT_ATTACHMENT_REJECT_REASON } = require('../../domain/incident/base');

describe('usecases/update-attachment-validation-status', () => {
  const FIXTURES_CONCERN = {
    entityId: 'ITEM-001',
    entityType: 'ITEM',
    amount: null,
    amountType: null
  };
  const FIXTURES_INCIDENT = {
    status: 'CREATED',
    refundStatus: 'CREATED',
    attachmentValidations: [
      {
        id: 1001,
        type: AttachmentValidation.TYPES.BUYING_INVOICE,
        validationId: 'VALIDATION-001',
        status: 'CREATED'
      },
      {
        id: 1002,
        type: AttachmentValidation.TYPES.COMMERCIAL_INVOICE,
        validationId: 'VALIDATION-002',
        status: 'CREATED'
      },
      {
        id: 1003,
        type: AttachmentValidation.TYPES.IDENTIFICATION_DOCUMENT,
        validationId: 'VALIDATION-003',
        status: 'CREATED'
      },
      {
        id: 1004,
        type: AttachmentValidation.TYPES.AFFIDAVIT,
        validationId: 'VALIDATION-004',
        status: 'CREATED'
      },
      {
        id: 1005,
        type: AttachmentValidation.TYPES.POLICE_REPORT,
        validationId: 'VALIDATION-005',
        status: 'CREATED'
      }
    ]
  };

  const FIXTURE_REFUND = {
    id: 12345678,
    amount: 50,
    amountType: 'VALUE'
  };

  let update;
  let incidentRepository;
  let productRepository;
  let refundRepository;
  let incident;

  beforeEach(() => {
    incidentRepository = {
      findByAttachmentValidationId: sinon.spy(async () => incident),
      updateAttachmentValidation: sinon.spy(),
      updateConcerns: sinon.spy(),
      update: sinon.spy()
    };
    productRepository = {
      findById: sinon.spy(async () => ({
        ...FIXTURES.PRODUCT,
        weight: 2000
      }))
    };
    refundRepository = {
      createFromIncident: sinon.spy(async () => FIXTURE_REFUND.id)
    };

    update = usecase({
      incidentRepository,
      productRepository,
      refundRepository
    });
  });

  it('should reject if validation is not found', async () => {
    incident = null;

    await expect(
      update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.VALIDATED
      })
    ).to.be.rejectedWith(ResourceNotFoundError, /001/);
  });

  it('should start incident when validation is started', async () => {
    incident = new ProductDamagedInWarehouseIncident(FIXTURES_INCIDENT);

    await update.execute({
      validationId: 'VALIDATION-001',
      status: AttachmentValidation.STATUSES.STARTED
    });

    expect(incidentRepository.update.calledOnce).to.be.true;
    const [[payload]] = incidentRepository.update.args;
    // no incident document on Sku damaged in WH
    expect(payload.status).to.eql('RESOLVED');
    expect(payload.refundStatus).to.eql('STARTED');

    expect(incidentRepository.updateAttachmentValidation.calledOnce).to.be.true;
    const [[validation]] = incidentRepository.updateAttachmentValidation.args;
    expect(validation.id).to.eql(1001);
    expect(validation.status).to.eql('STARTED');
  });

  it('should reject incident when validation is rejected', async () => {
    incident = new ProductDamagedInWarehouseIncident(FIXTURES_INCIDENT);

    await update.execute({
      validationId: 'VALIDATION-001',
      status: 'REJECTED'
    });

    expect(incidentRepository.update.calledOnce).to.be.true;
    const [[payload]] = incidentRepository.update.args;
    // no incident document on Sku damaged in WH
    expect(payload.status).to.eql('RESOLVED');
    expect(payload.refundStatus).to.eql('REJECTED');
  });

  describe('when validation is validated', () => {
    beforeEach(async () => {
      incident = new ProductDamagedInWarehouseIncident({
        ...FIXTURES_INCIDENT,
        concerns: [new Concern(FIXTURES_CONCERN)]
      });
    });

    it('should reject invalid payloads', async () => {
      await expect(
        update.execute({
          validationId: 'VALIDATION-001',
          status: AttachmentValidation.STATUSES.VALIDATED,
          payload: { skuValue: 'invalid amount' }
        })
      ).to.be.rejectedWith(InvalidAttachmentValidationPayloadError);
    });

    it('should update incident status as resolved', async () => {
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { skuValue: FIXTURE_REFUND.amount }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      // no incident document on Sku damaged in WH
      expect(updatePayload.status).to.eql('RESOLVED');
      expect(updatePayload.refundStatus).to.eql('REJECTED');
    });

    it('should save refund informations', async () => {
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.VALIDATED,
        payload: { skuValue: FIXTURE_REFUND.amount }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      // no incident document on Sku damaged in WH
      expect(updatePayload.status).to.eql('RESOLVED');
      expect(updatePayload.refundStatus).to.eql('RESOLVED');
      expect(updatePayload.refundId).to.eql(FIXTURE_REFUND.id);

      expect(incidentRepository.updateConcerns.calledOnce).to.be.true;
      const [[updateConcernsPayload]] = incidentRepository.updateConcerns.args;
      expect(updateConcernsPayload).to.have.length(1);
      expect(updateConcernsPayload[0]).to.include({
        amount: FIXTURE_REFUND.amount,
        amountType: FIXTURE_REFUND.amountType
      });
    });

    it('should save payload from document validation', async () => {
      const payload = { skuValue: FIXTURE_REFUND.amount };
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.VALIDATED,
        payload: { skuValue: FIXTURE_REFUND.amount }
      });

      expect(incidentRepository.updateAttachmentValidation.calledOnce).to.be.true;
      const [[validationPayload]] = incidentRepository.updateAttachmentValidation.args;

      expect(validationPayload.id).to.eql(1001);
      expect(validationPayload.status).to.eql('VALIDATED');
      expect(validationPayload.payload).to.eql(payload);
    });

    it('should send refunds to billing', async () => {
      const payload = { skuValue: FIXTURE_REFUND.amount };
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.VALIDATED,
        payload
      });

      const [[sentIncident]] = refundRepository.createFromIncident.args;
      expect(sentIncident.concerns).to.have.length(1);
      expect(sentIncident.concerns[0]).to.include({
        amount: FIXTURE_REFUND.amount,
        amountType: FIXTURE_REFUND.amountType
      });
    });

    // update inciden
    it('when incident was already resolved, it should not reprocess refunds', async () => {
      incident = new ProductDamagedInWarehouseIncident({
        ...FIXTURES_INCIDENT,
        status: 'RESOLVED',
        refundStatus: 'RESOLVED',
        refundId: 99999999
      });
      const payload = { skuValue: FIXTURE_REFUND.amount };

      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.VALIDATED,
        payload
      });

      const [[updatePayload]] = incidentRepository.update.args;
      // should have stayed on previous incident
      expect(updatePayload.refundId).to.not.eql(FIXTURE_REFUND.id);
    });

    it('should update reject reason for incident when buying invoice is not mentioned', async () => {
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...BUYING_INVOICE_PAYLOAD, isInvoiceWordExists: false }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      // no incident document on Sku damaged in WH
      expect(updatePayload.status).to.eql('RESOLVED');
      expect(updatePayload.refundStatus).to.eql('REJECTED');
      expect(updatePayload.rejectedReason).to.eql(
        JSON.stringify([
          {
            key: `BUYING_INVOICE.${INCIDENT_ATTACHMENT_REJECT_REASON.INVOICE_NOT_MENTIONED}`
          }
        ])
      );
    });
    it('should add a new rejected reason when multiple attachments are rejected', async () => {
      await update.execute({
        validationId: 'VALIDATION-001',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...BUYING_INVOICE_PAYLOAD, isInvoiceWordExists: false }
      });

      await update.execute({
        validationId: 'VALIDATION-002',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...COMMERCIAL_INVOICE_PAYLOAD, isInvoiceWordExists: false }
      });

      const [[updatePayload]] = incidentRepository.update.args;

      expect(updatePayload.status).to.eql('RESOLVED');
      expect(updatePayload.refundStatus).to.eql('REJECTED');
      expect(updatePayload.rejectedReason).to.eql(
        JSON.stringify([
          {
            key: `${AttachmentValidation.TYPES.BUYING_INVOICE}.${INCIDENT_ATTACHMENT_REJECT_REASON.INVOICE_NOT_MENTIONED}`
          },
          {
            key: `${AttachmentValidation.TYPES.COMMERCIAL_INVOICE}.${INCIDENT_ATTACHMENT_REJECT_REASON.INVOICE_NOT_MENTIONED}`
          }
        ])
      );
    });
    it("should update reject reason for incident when name doest't exist in identification doc", async () => {
      await update.execute({
        validationId: 'VALIDATION-003',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...IDENTIFICATION_DOCUMENT_PAYLOAD, isNameExists: false }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      expect(updatePayload.rejectedReason).to.eql(
        JSON.stringify([
          {
            key: `${AttachmentValidation.TYPES.IDENTIFICATION_DOCUMENT}.${INCIDENT_ATTACHMENT_REJECT_REASON.NAME_NOT_MENTIONED}`
          }
        ])
      );
    });
    it("should update reject reason for incident when author name doest't not mentioned in affidavit", async () => {
      await update.execute({
        validationId: 'VALIDATION-004',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...AFFIDAVIT_PAYLOAD, isAuthorNameExists: false }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      expect(updatePayload.rejectedReason).to.eql(
        JSON.stringify([
          {
            key: `${AttachmentValidation.TYPES.AFFIDAVIT}.${INCIDENT_ATTACHMENT_REJECT_REASON.AUTHOR_NAME_NOT_MENTIONED}`
          }
        ])
      );
    });
    it('should update reject reason for incident when cub number not mentioned in police report', async () => {
      await update.execute({
        validationId: 'VALIDATION-005',
        status: AttachmentValidation.STATUSES.REJECTED,
        payload: { ...POLICE_REPORT_PAYLOAD, reference: undefined }
      });

      expect(incidentRepository.update.calledOnce).to.be.true;
      const [[updatePayload]] = incidentRepository.update.args;
      expect(updatePayload.rejectedReason).to.eql(
        JSON.stringify([
          {
            key: `${AttachmentValidation.TYPES.POLICE_REPORT}.${INCIDENT_ATTACHMENT_REJECT_REASON.CUB_NUMBER_NOT_MENTIONED}`
          }
        ])
      );
    });
  });
});
