const { v4 } = require('uuid');
const {
  assert,
  BadConcernAmountError,
  BadConcernIdNotProvided,
  BadConcernQuantityError
} = require('../../errors');

const joinId = (...operands) => operands.join('|');

const TYPES = {
  MERCHANDISE: 'MERCHANDISE',
  PARCEL_SHIPPING: 'PARCEL_SHIPPING'
};

const ENTITY_TYPES = {
  ITEM: 'ITEM',
  PRODUCT: 'PRODUCT'
};

const AMOUNT_TYPES = {
  VALUE: 'VALUE',
  PERCENT: 'PERCENT'
};

const CONCERN_DEFAULTS = {
  quantity: null,
  amount: null,
  amountType: null
};

/**
 * One Incident has many Concerns.
 * It describes the finer grained "concern" of what this incident is about.
 *
 * E.g.: A ParcelLostIncident might have concerns:
 *  - N × Item's MERCHANDISE
 *  - 1 × Parcel's SHIPPING fee
 */
class Concern {
  constructor(values) {
    const amount = values.amount === null ? null : Number(values.amount);

    if (values.entityType !== ENTITY_TYPES.PRODUCT) {
      assert(
        amount === null || !Number.isNaN(amount),
        BadConcernAmountError,
        amount,
        'not a number'
      );
    }

    Object.assign(this, {
      ...CONCERN_DEFAULTS,
      ...values,
      amount
    });
  }

  static subtract(fromConcerns, theseConcerns) {
    const subtractedIds = theseConcerns.map(({ id }) => id);

    return fromConcerns.filter(({ id }) => !subtractedIds.includes(id));
  }

  static createItemMerchandise(incidentId, itemIds, amount) {
    assert(
      amount === null || amount > 0,
      BadConcernAmountError,
      amount,
      'should be strictly positive'
    );

    return itemIds.map(
      (itemId) =>
        new Concern({
          // important: unicity is based on this
          id: joinId(TYPES.MERCHANDISE, itemId),
          incidentId,
          type: TYPES.MERCHANDISE,
          entityType: ENTITY_TYPES.ITEM,
          entityId: itemId,
          quantity: 1,
          amount,
          amountType: AMOUNT_TYPES.VALUE
        })
    );
  }

  /**
   * @returns {boolean}
   */
  hasRefundToDeclare() {
    return !!(this.amount && this.amountType);
  }

  static createProduct(incidentId, product) {
    assert(product.entityId, BadConcernIdNotProvided, incidentId);
    assert(
      product.quantity,
      BadConcernQuantityError,
      product.quantity,
      product.entityId,
      'should be strictly positive'
    );

    return new Concern({
      ...product,
      id: v4(),
      incidentId,
      type: TYPES.MERCHANDISE,
      entityType: ENTITY_TYPES.PRODUCT,
      amount: null
    });
  }

  // static createParcelShippingService(incidentId, parcelId, amount) {
  //     assert(amount > 0 && amount <= 100,
  // BadConcernAmountError, amount, 'should be between 0 and 100');

  //     return new Concern({
  //         id: joinId(TYPES.PARCEL, parcelId),
  //         incidentId,
  //         type: TYPES.MERCHANDISE,
  //         entityType: ENTITY_TYPES.ITEM,
  //         entityId: parcelId,
  //         quantity: 1,
  //         amount,
  //         amountType: AMOUNT_TYPES.PERCENT
  //     });
  // }
}

Concern.TYPES = TYPES;
Concern.ENTITY_TYPES = ENTITY_TYPES;
Concern.AMOUNT_TYPES = AMOUNT_TYPES;

module.exports = { Concern };
