const { ReceivedDamagedDetails } = require('./parcel-received-damaged');

class NeverReceivedDetails extends ReceivedDamagedDetails {}

module.exports = { NeverReceivedDetails };
