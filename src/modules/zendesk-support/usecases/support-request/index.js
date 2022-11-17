// modules
const { AttachmentValidation } = require('../../../incident/domain/attachment-validation');
// drivers
const getData = require('../../../../drivers/cubyn-data');
const zendeskDriver = require('../../../../drivers/zendesk/ticket');

const { TYPES } = AttachmentValidation;

function groupFilesByOldType(fileMap = {}) {
  const mappingToOldType = (type) => {
    switch (type) {
      case TYPES.BUYING_INVOICE:
      case TYPES.COMMERCIAL_INVOICE:
        return 'INVOICE';
      default:
        return type;
    }
  };

  return Object.keys(fileMap).reduce((files, type) => {
    const oldType = mappingToOldType(type);
    const memo = files[oldType] || [];

    return {
      ...files,
      [oldType]: [...memo, ...fileMap[type]]
    };
  }, {});
}

class SupportRequest {
  constructor({ invoke, publish, context }) {
    this.invoke = invoke;
    this.context = context;
    this.publish = publish;
  }

  async execute(data) {
    const { ticket, type } = data;

    const dataFormated = {
      ...data,
      fileMap: groupFilesByOldType(data.fileMap)
    };

    const { user, entityData, generalData } = await getData(
      {
        data: dataFormated,
        invoke: this.invoke,
        context: this.context,
        reason: ticket.reason
      },
      true,
      true
    );

    const zendeskTicket = await zendeskDriver.create({
      ticket,
      user,
      publish: this.publish,
      data: entityData,
      generalData,
      type,
      context: this.context
    });

    return zendeskTicket;
  }
}

module.exports = { SupportRequest };
