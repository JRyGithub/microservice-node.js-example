const merge = require('lodash/merge');
const {
  // eslint-disable-next-line no-unused-vars
  BaseIncident,
  ORIGIN_TYPES
} = require('../../../../modules/incident/domain/incident/base');
const { INCIDENT_TYPES, createIncident } = require('../../../../modules/incident/domain/incident');

/**
 * @type {BaseIncident}
 */
const BASE_INCIDENT = {
  // eslint-disable-next-line no-magic-numbers
  ownerId: parseInt(Math.random() * 10000, 10),
  type: INCIDENT_TYPES.PARCEL_NEVER_RECEIVED,
  origin: ORIGIN_TYPES.SHIPPER
};

/**
 * @param {Partial<BaseIncident>} overrides
 * @returns {BaseIncident}
 */
function buildIncident(overrides) {
  return createIncident(merge({}, BASE_INCIDENT, overrides));
}

module.exports = { buildIncident };
