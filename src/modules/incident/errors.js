/* eslint-disable max-classes-per-file */
const {
  assert,
  BadRequestError,
  ServerError,
  ResourceNotFoundError
} = require('@devcubyn/core.errors');

class InvalidIncidentTypeError extends BadRequestError {
  constructor(type) {
    super(`Invalid incident type: ${type}`);
    this.type = type;
  }
}

class MissingAttachmentError extends BadRequestError {
  constructor(type) {
    super(`Missing attachment type: ${type}`);
    this.type = type;
  }
}

class CannotCreateDocumentValidationError extends BadRequestError {
  constructor(message) {
    super(`Cannot create document validation: ${message}`);
  }
}

class InvalidAttachmentValidationPayloadError extends BadRequestError {
  constructor(type, payload) {
    super(`Invalid validation payload for type ${type}`);
    this.type = type;
    this.payload = payload;
  }
}

class IncidentPreprocessingError extends BadRequestError {
  constructor(preprocessing) {
    const errors = preprocessing.getCheckErrors();
    const types = new Set(errors.map((error) => error.type));
    const message = Array.from(types).join(', ');

    super(`Preprocessing yielded ${errors.length} error(s): ${message}`);

    this.checks = preprocessing.checks;
  }
}

class InvalidStatusError extends BadRequestError {
  constructor(status, allowedStatuses) {
    super(`Invalid status ${status}, possible values are ${allowedStatuses.join('|')}`);
    this.status = status;
    this.allowedStatuses = allowedStatuses;
  }
}

class InvalidManualFlowIncidentError extends BadRequestError {
  constructor(type) {
    super(`Incident of type ${type} cannot be used for manual flow`);
    this.type = type;
  }
}

class BadConcernAmountError extends BadRequestError {
  constructor(amount, message) {
    super(`Invalid amount value ${amount}: ${message}`);
    this.amount = amount;
  }
}

class BadConcernIdNotProvided extends BadRequestError {
  constructor(incidentId) {
    super(`Id not provided for product in incident ${incidentId}`);
    this.incidentId = incidentId;
  }
}

class BadConcernQuantityError extends BadRequestError {
  constructor(quantity, productId, message) {
    super(`Invalid quantity value ${quantity} for ${productId}: ${message}`);
    this.quantity = quantity;
  }
}

module.exports.assert = assert;

module.exports = {
  assert,
  BadConcernAmountError,
  BadConcernIdNotProvided,
  BadConcernQuantityError,
  BadRequestError,
  CannotCreateDocumentValidationError,
  InvalidAttachmentValidationPayloadError,
  IncidentPreprocessingError,
  InvalidIncidentTypeError,
  InvalidStatusError,
  InvalidManualFlowIncidentError,
  MissingAttachmentError,
  ResourceNotFoundError,
  ServerError
};
