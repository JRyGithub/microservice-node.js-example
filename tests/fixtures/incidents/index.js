const OWNER_ID = 10001;
const REFUND_ID = 99887766;

const INCIDENT = {
  id: '123',
  ownerId: OWNER_ID,
  source: 'SHIPPER',
  isManuallyUpdated: false
};

const UPDATE_INCIDENT_STATUS_PAYLOAD = {
  id: '123',
  status: 'RESOLVED'
};

module.exports = {
  INCIDENT,
  OWNER_ID,
  UPDATE_INCIDENT_STATUS_PAYLOAD,
  REFUND_ID
};
