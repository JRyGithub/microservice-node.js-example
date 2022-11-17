/* eslint-disable complexity */
const requestBasic = require('request');
const { ServerError, BadRequestError } = require('@devcubyn/core.errors');
const getContentType = require('../file');
const ZendeskUserService = require('./user');
const zendeskOrganization = require('./organization');
const createCustomFields = require('./create-custom-fields');
const { TYPES } = require('../../modules/models/entity-type/constants');
const { formatPrettyDate, getOrderRecipientName } = require('./format-functions');
const PARCEL_STATUSES = require('./parcel-statuses');
const logger = require('../logger');
const { apiCall } = require('./api');
const env = require('../../env');

// eslint-disable-next-line
const EMAIL_REGEX =
  /^[-a-z0-9~!$%^&*_=+}{'?]+(\.[-a-z0-9~!$%^&*_=+}{'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

// zendesk basic http authentification
const auth = {
  user: env.ZENDESK_EMAIL,
  pass: env.ZENDESK_PASSWORD
};

module.exports = {
  // Create a ticket on zendesk
  async create({ type, ticket: ticketJSON, user, data, generalData, publish, context }) {
    const zendeskUser = new ZendeskUserService({ context });
    const { reason, comment, fileMap } = ticketJSON;
    let { requester: submitter, collaborators } = ticketJSON;

    if (collaborators) {
      collaborators = this.validateCollaborators(collaborators);
    }

    const organization = await zendeskOrganization.findOrCreate({ user, context });

    submitter = await zendeskUser.findOrCreate({ email: submitter }, organization);

    const requester = await zendeskUser.findOrCreate(user, organization);

    const collabs = await zendeskUser.findOrCreateFromEmails(collaborators || [], organization);

    const description = this.getDescription(type, data, reason, comment);

    const ticket = {
      subject: this.getSubject(type, data, reason),
      description,
      recipient: requester.email,
      // new ticket is created "on behalf of"
      requester_id: requester.id,
      submitter_id: submitter.id,
      collaborators: collabs.map((collaborator) => collaborator.id),
      organization_id: organization.id,
      priority: 'urgent',
      custom_fields: [
        ...(await createCustomFields(type, { data: { ...data, ...generalData } }, true))
      ]
    };

    // Upload Attachments file handler
    if (fileMap) {
      const filesToUpload = this.parseFiles(fileMap);

      if (filesToUpload.length > 0) {
        logger.info('Ticket has files', { fileMap, context });

        const uploads = await this.handleAttachmentsCreation(filesToUpload);
        ticket.comment = { body: description, uploads };
      }
    }

    let res;

    try {
      res = await apiCall({
        method: 'POST',
        uri: '/tickets.json',
        body: { ticket },
        context,
        type: 'create ticket'
      });
    } catch (error) {
      logger.error('Zendesk ticket creation fail', {
        ticket,
        error,
        context
      });
      throw new Error(error.message);
    }

    if (this.isOrderEntity(type)) {
      await publish('parcel-meta.upsert:v1', {
        filters: { ids: data.id },
        metas: { customerServiceTicket: res.ticket }
      });
    }

    return {
      id: res.ticket.id,
      description: res.ticket.description,
      subject: res.ticket.subject,
      type,
      referenceId: data.id,
      createdAt: Date.parse(res.ticket.created_at),
      updatedAt: Date.parse(res.ticket.updated_at)
    };
  },

  async update({ type, ticketId, data, publish, invoke, context }) {
    let res;

    try {
      res = await apiCall({
        method: 'PUT',
        uri: `/tickets/${ticketId}.json`,
        body: {
          ticket: {
            custom_fields: await createCustomFields(type, { data }),
            ...(this.isOrderEntity(type)
              ? {
                  tags: await this.handleTags({
                    ticketId,
                    parcelId: data.referenceId,
                    context,
                    invoke
                  })
                }
              : {})
          }
        },
        context,
        type: 'update ticket'
      });
    } catch (error) {
      logger.error('Zendesk ticket update error', { ticketId, error, context });

      throw new ServerError(error.message);
    }

    if (res && this.isOrderEntity(type)) {
      await publish('parcel-meta.upsert:v1', {
        filters: { ids: data.id },
        metas: { customerServiceTicket: res.ticket }
      });
    }

    return 'Success';
  },

  async handleTags({ ticketId, parcelId, context, invoke }) {
    let currentTags;

    try {
      const { tags } = await apiCall({
        uri: `/tickets/${ticketId}/tags.json`,
        context,
        type: 'get tags'
      });

      currentTags = tags;
    } catch (error) {
      logger.error('Zendesk get tags fail', { ticketId, error, context });

      throw new Error(error.message);
    }

    return [...new Set(currentTags.concat(await this.getTags(parcelId, invoke)))];
  },

  async read({ type, referenceId, context }) {
    let tickets;

    try {
      tickets = await apiCall({
        uri: `/search.json?query=type:ticket ${type} ${referenceId}`,
        context,
        type: 'read ticket'
      });
    } catch (error) {
      logger.error('Zendesk ticket read fail', { referenceId, error, context });

      throw new Error(error.message);
    }

    return tickets.results.length ? tickets.results[0].id : '';
  },

  async getTags(parcelId, invoke) {
    const eventsObjects = await invoke('parcel-event.list:v1', {
      filters: { parcelId }
    });

    if (!eventsObjects.length) {
      return [];
    }

    const uniqueMessages = [...new Set(eventsObjects.map((tagObject) => tagObject.message))];
    // eslint-disable-next-line no-magic-numbers
    const concatenatedEvents = uniqueMessages.slice(-10).join(' | ').toLowerCase();

    return PARCEL_STATUSES.reduce((acc, curr) => {
      if (curr.value.find((val) => concatenatedEvents.includes(val))) {
        acc.push(curr.key);
      }

      return acc;
    }, []);
  },

  parseFiles(fileMap) {
    return (
      Object.keys(fileMap)
        // prefixes with file types
        .map((fileType) =>
          fileMap[fileType].map(({ fileKey, fileName, url }) => ({
            fileName: `${fileType}_${fileName}`,
            fileKey,
            url
          }))
        )
        // flattens all files
        .reduce((acc, value) => {
          if (value.length) acc.push(...value);

          return acc;
        }, [])
    );
  },

  validateCollaborators(collaborators = []) {
    const validated = collaborators.every((email) => !!EMAIL_REGEX.test(email));

    if (!validated) {
      throw new BadRequestError('The CC field is not valid');
    }

    return collaborators;
  },

  getSubject(type, data, reason) {
    switch (type) {
      case TYPES.WIO:
        return `WIO ${data.pid} - ${reason}`;
      case TYPES.SKU:
        return `SKU ${data.quantityPerStatus.sku} - ${data.quantityPerStatus.name} - ${reason}`;
      case TYPES.INVOICE:
        return `Invoice Number ${data.id} - ${formatPrettyDate(data.dueDate)} - ${reason}`;
      default:
        // ORDER or RETURN_ORDER type
        return `CUB${data.id} - ${getOrderRecipientName(data)} - ${reason}`;
    }
  },

  getDescription(type, data, reason, comment) {
    switch (type) {
      case TYPES.WIO:
        return `WIO n° : ${data.pid}\n \
                    Motif : ${reason}\n \
                    Date de création du ticket : ${formatPrettyDate(new Date())}\n \
                    Date de création du WIO : ${formatPrettyDate(data.createdAt)}\n \
                    Date de reception du WIO : ${formatPrettyDate(data.receiptStartedAt)}\n \
                    Commentaire : ${comment || ''}\n`;
      case TYPES.SKU:
        return `SKU : ${data.quantityPerStatus.sku} \n \
                    Product Name : ${data.quantityPerStatus.name} \n \
                    Motif : ${reason}\n \
                    Date de création du ticket : ${formatPrettyDate(new Date())}\n \
                    Commentaire : ${comment || ''}\n`;
      case TYPES.INVOICE:
        return `Invoice Number : ${data.id}\n \
                    Invoice Date : ${formatPrettyDate(data.dueDate)}\n \
                    Motif : ${reason}\n \
                    Date de création du ticket : ${formatPrettyDate(new Date())}\n \
                    Commentaire : ${comment || ''}\n`;
      default:
        // ORDER or RETURN_ORDER type
        return ` Motif : ${reason}\n \
                    Date de création du ticket : ${formatPrettyDate(new Date())}\n \
                    Commentaire : ${comment || ''}\n \
                    Expédition : CUB${data.id}\n \
                    Référence client : ${data.orderRef}\n \
                    Destinataire : ${getOrderRecipientName(data)}\n \
                    Date d'expédition : ${
                      data.shippedAt || data.pickedAt
                        ? formatPrettyDate(data.shippedAt || data.pickedAt)
                        : null
                    }\n`;
    }
  },

  async handleAttachmentsCreation(filesToUpload) {
    const promises = filesToUpload.map(this.createZendeskAttachment.bind(this));

    return Promise.all(promises);
  },
  /*
   * Uploads every files by linking them with the token after the first upload
   */
  async createZendeskAttachment(file) {
    const contentType = getContentType(file.fileName);

    if (!contentType) {
      throw new BadRequestError('Attachment is not supported');
    }

    const zendeskApi = `https://${env.ZENDESK_DOMAIN}.zendesk.com/api/v2`;

    const options = {
      url: `${zendeskApi}/uploads.json?filename=${encodeURIComponent(file.fileName)}`,
      auth,
      encoding: null,
      headers: {
        'Content-Type': contentType,
        Accept: 'application/json'
      },
      forever: true
    };

    return new Promise((resolve, reject) => {
      requestBasic(file.url).pipe(
        requestBasic.post(options, (err, res, body) => {
          /* istanbul ignore next */
          if (err) return reject(err);
          if (res.statusCode !== 201) return reject(new Error('Bad Zendesk API status'));

          return resolve(JSON.parse(body).upload.token);
        })
      );
    });
  },

  isOrderEntity(type) {
    return type === TYPES.ORDER || type === TYPES.RETURN_ORDER;
  }
};
