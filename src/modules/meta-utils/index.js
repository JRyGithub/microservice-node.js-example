const metaQuery = (recipient, status) => {
  return {
    $and: [
      {
        'metas.customerServiceTicket.recipient': recipient
      },
      {
        'metas.customerServiceTicket.status': status
      }
    ]
  };
};

const TICKET_STATUS = {
  CLOSED: 'closed',
  NEW: 'new',
  OPEN: 'open',
  HOLD: 'hold',
  PENDING: 'pending',
  SOLVED: 'solved'
};

module.exports = { metaQuery, TICKET_STATUS };
