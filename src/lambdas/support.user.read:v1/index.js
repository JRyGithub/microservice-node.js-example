const ZendeskUserService = require('../../drivers/zendesk/user');

function handler({ data, context }) {
  const { email } = data;
  const zendeskUser = new ZendeskUserService({ context });

  return zendeskUser.find({ email });
}

const meta = {
  retry: {
    max: 0
  }
};

module.exports = { handler, meta };
