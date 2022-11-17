class PreprocessingResult {
  constructor() {
    this.checks = [];
  }

  hasErrors() {
    return this.getErrorCount() > 0;
  }

  getErrorCount() {
    return this.getCheckErrors().length;
  }

  getCheckErrors() {
    return this.checks.filter((check) => !check.success);
  }

  markCheckOK(type, details = {}) {
    this.checks.push({ success: true, type, details });
  }

  markCheckKO(type, details = {}) {
    this.checks.push({ success: false, type, details });
  }

  attachmentUploaded(type, details = {}, attachmentUploaded) {
    this.checks.push({ success: attachmentUploaded, type, details });
  }

  assert(test, checkType, details = {}) {
    if (test) {
      this.markCheckOK(checkType, details);
    } else {
      this.markCheckKO(checkType, details);
    }
  }
}

const PreprocessingChecks = {
  FIND_PRODUCT: 'FIND_PRODUCT',
  CHECK_PRODUCT_TYPE: 'CHECK_PRODUCT_TYPE',
  FIND_MATCHING_CONCERNS: 'FIND_MATCHING_CONCERNS',
  FILTER_EXISTING_CONCERNS: 'FILTER_EXISTING_CONCERNS',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED'
};

module.exports = {
  PreprocessingResult,
  PreprocessingChecks
};
