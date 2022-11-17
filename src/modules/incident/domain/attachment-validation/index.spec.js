const { expect } = require('chai');
const { AttachmentValidation } = require('.');
const { InvalidStatusError, InvalidAttachmentValidationPayloadError } = require('../../errors');

const { TYPES, STATUSES } = AttachmentValidation;

describe('domain/attachment-validation', () => {
  describe('isPayloadValid', () => {
    it('should validate BUYING_INVOICE payloads when skuValue is a number', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE
      });

      expect(validation.isPayloadValid({ skuValue: 30 })).to.be.true;
    });

    it('should not validate BUYING_INVOICE payloads when skuValue is missing', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE
      });

      expect(validation.isPayloadValid({ missing: 'skuValue: 30' })).to.be.false;
    });

    it('should not validate BUYING_INVOICE payloads when skuValue is not a number', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE
      });

      expect(validation.isPayloadValid({ skuValue: 'thirty' })).to.be.false;
    });

    it('should not validate BUYING_INVOICE payloads when missing payload', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE
      });

      expect(validation.isPayloadValid(null)).to.be.false;
    });

    it('should validate any payload when any other type', () => {
      const validation = new AttachmentValidation({
        type: 'UNKNOWN'
      });

      expect(validation.isPayloadValid(null)).to.be.true;
    });
  });

  describe('setStatus', () => {
    it('should not accept an unknown status', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE,
        status: STATUSES.CREATED
      });

      expect(() => validation.setStatus('UNKNOWN')).to.throw(InvalidStatusError, /UNKNOWN/);
    });

    it('should ignore payload when status is not VALIDATED', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE,
        status: STATUSES.CREATED
      });

      validation.setStatus(STATUSES.REJECTED, { skuValue: 30 });
      expect(validation.payload).to.be.null;
      expect(validation.status).to.eql(STATUSES.REJECTED);
    });

    it('should not accept an invalid payload', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE,
        status: STATUSES.CREATED
      });

      expect(() => validation.setStatus(STATUSES.VALIDATED, { skuValue: 'thirty' })).to.throw(
        InvalidAttachmentValidationPayloadError
      );
    });

    it('should update status + payload when status is VALIDATED and payload is valid', () => {
      const validation = new AttachmentValidation({
        type: TYPES.BUYING_INVOICE,
        status: STATUSES.CREATED
      });

      validation.setStatus(STATUSES.VALIDATED, { skuValue: 30 });

      expect(validation.status).to.eql(STATUSES.VALIDATED);
      expect(validation.payload).to.eql({
        skuValue: 30
      });
    });
  });
});
