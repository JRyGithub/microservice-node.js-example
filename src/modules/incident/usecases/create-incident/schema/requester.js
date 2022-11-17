const schemaUtils = require('carotte-schema-utils');

const requester = schemaUtils.object('Requester related information', {
  properties: {
    firstName: schemaUtils.string('First Name'),
    lastName: schemaUtils.string('Last Name'),
    organizationName: schemaUtils.string('Organization name'),
    email: schemaUtils.string('Email'),
    language: schemaUtils.string('Language'),
    bankInfo: schemaUtils.object('Bank account information', {
      properties: {
        firstName: schemaUtils.string('Account first Name'),
        lastName: schemaUtils.string('Account last Name'),
        iban: schemaUtils.string('Account IBAN'),
        bic: schemaUtils.string('Account BIC'),
        country: schemaUtils.string('Country')
      },
      required: ['firstName', 'lastName', 'iban', 'bic', 'country']
    })
  },
  required: ['firstName', 'lastName', 'email', 'bankInfo']
});

module.exports = { requester };
