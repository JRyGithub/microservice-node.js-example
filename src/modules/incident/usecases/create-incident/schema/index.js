const { input: claimInput, output: claimOutput } = require('./claim');
const { input: incidentInput, output: incidentOutput } = require('./incident');

module.exports = {
  claim: {
    input: claimInput,
    output: claimOutput
  },
  incident: {
    input: incidentInput,
    output: incidentOutput
  }
};
