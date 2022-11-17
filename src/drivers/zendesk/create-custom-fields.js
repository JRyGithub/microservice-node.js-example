const { get } = require('lodash');
const SupportMapping = require('../../modules/models/support-mapping');
const formatFunctions = require('./format-functions');
const { TYPES } = require('../../modules/models/entity-type/constants');

const getFieldMappings = async (type, appendGeneralData) => {
  // eslint-disable-next-line no-param-reassign
  type = type === TYPES.RETURN_ORDER ? [TYPES.ORDER] : [type];

  // Because RETURN_ORDER type uses the same fields as ORDER type we use ORDER
  return SupportMapping.query().whereIn(
    'entityTypeId',
    type.concat(appendGeneralData ? [TYPES.GENERAL] : [])
  );
};

async function handler(type, payload, appendGeneralData = false) {
  const mappings = await getFieldMappings(type, appendGeneralData);

  return mappings.reduce(
    (acc, { zendeskField, cubynField, formatFunction: formatFunctionName }) => {
      const formatFunction = formatFunctions[formatFunctionName];
      const value = get(payload, cubynField);

      // eslint-disable-next-line no-eq-null
      if (value != null) {
        const formatedValue = formatFunction ? formatFunction(value) : value;

        if (formatedValue !== null) {
          acc.push({
            id: Number.isNaN(parseInt(zendeskField, 10))
              ? zendeskField
              : parseInt(zendeskField, 10),
            value: formatedValue
          });
        }
      }

      return acc;
    },
    []
  );
}

module.exports = handler;
