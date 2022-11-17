const lodash = require('lodash');
const { assert } = require('@devcubyn/core.errors');
const env = require('../env');

assert(
  env.ZENDESK_FIELD_CUBYN_TRACKING_NUMBER,
  Error,
  'Missing environment variable [ZENDESK_FIELD_CUBYN_TRACKING_NUMBER]'
);
assert(
  env.ZENDESK_FIELD_REFUND_TYPE,
  Error,
  'Missing environment variable [ZENDESK_FIELD_REFUND_TYPE]'
);
assert(
  env.ZENDESK_FIELD_AMOUNT_TO_REFUND,
  Error,
  'Missing environment variable [ZENDESK_FIELD_AMOUNT_TO_REFUND]'
);
assert(
  env.ZENDESK_FIELD_SHIPPING_FEES_REFUND,
  Error,
  'Missing environment variable [ZENDESK_FIELD_SHIPPING_FEES_REFUND]'
);
assert(
  env.ZENDESK_FIELD_RESPONSIBILITY,
  Error,
  'Missing environment variable [ZENDESK_FIELD_RESPONSIBILITY]'
);
assert(
  env.ZENDESK_FIELD_CUBYN_RESOLUTION,
  Error,
  'Missing environment variable [ZENDESK_FIELD_CUBYN_RESOLUTION]'
);

const KNOWN_CUSTOM_FIELDS = lodash(env)
  .pickBy((_value, keyName) => keyName.startsWith('ZENDESK_FIELD_'))
  .values()
  .map((value) => value.split(','))
  .fromPairs()
  .value();

class ZendeskTicket {
  static fromJson(source) {
    return Object.assign(new this(), objectToCamelCase(source), {
      customFields: nameFields(source.custom_fields, KNOWN_CUSTOM_FIELDS)
    });
  }
}

function objectToCamelCase(source) {
  return lodash.mapKeys(source, (_value, keyName) => lodash.camelCase(keyName));
}

/**
 * Make a list of zendesk ids & values readable by human
 * @param  {Array} source     `[{ id: 42, value 'qsd' }, ...]`
 * @param  {Object} dictionary `{ keyName: 42 }`
 * @return {Object}            `{ keyName: 'qsd' }`
 */
function nameFields(source, dictionary) {
  const fields = lodash(source).values().map(lodash.values).fromPairs().value();
  const knownFields = lodash(dictionary).reduce(
    (acc, fieldId, fieldName) => Object.assign(acc, { [fieldName]: fields[fieldId] }),
    {}
  );

  return knownFields;
}

module.exports = ZendeskTicket;
