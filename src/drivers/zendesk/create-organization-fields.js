const { get } = require('lodash');
const SupportMapping = require('../../modules/models/support-mapping');
const formatFunctions = require('./format-functions');
const { TYPES } = require('../../modules/models/entity-type/constants');

const getFieldMappings = async (type) => {
  const mappings = await SupportMapping.query().where('entityTypeId', type);

  return mappings;
};

async function handler(payload) {
  const mappings = await getFieldMappings(TYPES.SHIPPER_GENERAL);
  const organizationFields = mappings.reduce(
    (acc, { zendeskField, cubynField, formatFunction: formatFunctionName }) => {
      const formatFunction = formatFunctions[formatFunctionName];
      const value = get(payload, cubynField);

      // eslint-disable-next-line no-eq-null
      if (value != null) {
        const formatedValue = formatFunction ? formatFunction(value) : value;

        if (formatedValue !== null) {
          acc[zendeskField] = formatedValue;
        }
      }

      return acc;
    },
    {}
  );

  return organizationFields;
}

module.exports = handler;
