const { expect } = require('chai');
const { InvalidManualFlowIncidentError } = require('../../errors');
const { AttachmentValidation } = require('../attachment-validation');
const { BaseIncident } = require('./base');

const { STATUSES: AST } = AttachmentValidation;

describe('domain/incident-base', () => {
  let incident;
  let validations;

  beforeEach(() => {
    validations = {
      policeReport: { id: 'V-POLICE_REPORT', type: 'POLICE_REPORT', status: AST.CREATED },
      idCard: { id: 'V-ID_CARD', type: 'ID_CARD', status: AST.CREATED },
      invoice: { id: 'V-INVOICE', type: 'INVOICE', status: AST.CREATED }
    };

    const props = {
      status: 'CREATED',
      refundStatus: 'CREATED',
      attachmentValidations: Object.values(validations)
    };

    incident = new BaseIncident(props, ['POLICE_REPORT', 'ID_CARD'], ['INVOICE']);
  });

  describe('state machine', () => {
    it('should handle the nominal flow', () => {
      incident.updateAttachmentValidationStatus(validations.policeReport.id, AST.STARTED);

      expect(incident.status).to.eql('STARTED');
      expect(incident.refundStatus).to.eql('CREATED');

      incident.updateAttachmentValidationStatus(validations.policeReport.id, AST.VALIDATED);
      incident.updateAttachmentValidationStatus(validations.idCard.id, AST.VALIDATED);

      expect(incident.status).to.eql('RESOLVED');
      expect(incident.refundStatus).to.eql('CREATED');

      incident.updateAttachmentValidationStatus(validations.invoice.id, AST.STARTED);

      expect(incident.status).to.eql('RESOLVED');
      expect(incident.refundStatus).to.eql('STARTED');

      incident.updateAttachmentValidationStatus(validations.invoice.id, AST.VALIDATED);

      expect(incident.status).to.eql('RESOLVED');
      expect(incident.refundStatus).to.eql('RESOLVED');
    });

    it('status should be rejected when any validation becomes rejected', () => {
      incident.updateAttachmentValidationStatus(validations.idCard.id, AST.REJECTED);

      expect(incident.status).to.eql('REJECTED');
    });

    it('refund status should be blocked by incident status', () => {
      incident.updateAttachmentValidationStatus(validations.invoice.id, AST.VALIDATED);

      expect(incident.status).to.eql('CREATED');
      // should not have passed directly to RESOLVED
      expect(incident.refundStatus).to.eql('STARTED');
    });

    it('refund status should be rejected when incident is rejected', () => {
      incident.updateAttachmentValidationStatus(validations.invoice.id, AST.VALIDATED);
      incident.updateAttachmentValidationStatus(validations.idCard.id, AST.REJECTED);

      expect(incident.status).to.eql('REJECTED');
      expect(incident.refundStatus).to.eql('REJECTED');
    });

    it('a status rejection cancellation should unlock refund', () => {
      incident.updateAttachmentValidationStatus(validations.invoice.id, AST.VALIDATED);
      incident.updateAttachmentValidationStatus(validations.idCard.id, AST.REJECTED);

      incident.updateAttachmentValidationStatus(validations.idCard.id, AST.VALIDATED);
      incident.updateAttachmentValidationStatus(validations.policeReport.id, AST.VALIDATED);

      expect(incident.status).to.eql('RESOLVED');
      expect(incident.refundStatus).to.eql('RESOLVED');
    });
  });

  describe('manually force status', () => {
    it('should reject when incident does not support manual flow', async () => {
      expect(() => incident.forceReject('my reason')).to.throw(InvalidManualFlowIncidentError);
    });
  });
});
