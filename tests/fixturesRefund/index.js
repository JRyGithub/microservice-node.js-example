const request = require('request-promise-native');

const zendeskApi = `https://${process.env.ZENDESK_DOMAIN}.zendesk.com/api/v2`;

module.exports = async () => {
  const ticket = {
    subject: 'CUB123456789 - jean mi - reason',
    description: 'totootoo',
    recipient: 'metux@cubyn.com',
    requester_id: '1',
    submitter_id: '2',
    collaborators: ['mathieu@cubyn.com'],
    organization_id: '3',
    priority: 'urgent',
    custom_fields: [
      { id: 41131089, value: 'CUB123456789' },
      { id: 360000053477, value: 'shipping_fees_only' },
      { id: 360000053497, value: '10.02' },
      { id: 360000050538, value: 'shipping_fees_refunded' },
      { id: 360000053517, value: 'cubyn' },
      { id: 360000050618, value: 'validated' },
      { id: 360000053617, value: 'YES' },
      { id: 41132129, value: 'shipping_provider_refund_pending' },
      { id: 41132449, value: 'insurance_refund_pending' },
      { id: 360000053617, value: 'refunded' }
    ]
  };

  const res = await request.post({
    uri: `${zendeskApi}/tickets.json`,
    auth: {
      user: process.env.ZENDESK_EMAIL,
      pass: process.env.ZENDESK_PASSWORD
    },
    body: { ticket },
    json: true,
    forever: true
  });

  return res;
};
