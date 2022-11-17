/**
 * @interface DocumentValidationRepository
 */
class RpcDocumentValidationRepository {
  /**
   * @param {Function} invoke - carotte invoke function
   */
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string} type - type of the validation to be done on given attachments
   * @param {Attachment[]} attachments
   * @param {Object} input - any input required by that validation
   * @returns {Promise<number>} id of the validation created
   */
  async validate(type, attachments, input) {
    const { id } = await this.invoke('document-validation.create:v1', {
      payload: {
        type,
        initialPayload: input,
        attachments: attachments.map((attachment) => ({
          type: attachment.type,
          key: attachment.fileKey
        }))
      }
    });

    return id;
  }
}

module.exports = { RpcDocumentValidationRepository };
