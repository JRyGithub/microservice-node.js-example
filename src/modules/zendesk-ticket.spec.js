const { expect } = require('chai');
const _ = require('lodash');
const env = require('../env');

const ZendeskTicket = require('./zendesk-ticket');

const { ZENDESK_FIELD_CUBYN_TRACKING_NUMBER } = env;

describe('ZendeskTicket', () => {
  describe('.fromJson', () => {
    it('does not alter its argument', () => {
      const ticket = {
        some_field: 'value',
        custom_fields: [{ id: ZENDESK_FIELD_CUBYN_TRACKING_NUMBER, value: 'the value' }]
      };
      const save = _.cloneDeep(ticket);

      ZendeskTicket.fromJson(ticket);
      expect(ticket).to.deep.equal(save);
    });

    it('camelCases the attribute keys', () => {
      const ticket = {
        some_field: 'value',
        custom_fields: [{ id: ZENDESK_FIELD_CUBYN_TRACKING_NUMBER, value: 'the value' }]
      };

      const zendeskTicket = ZendeskTicket.fromJson(ticket);
      expect(zendeskTicket).to.have.deep.keys(['someField', 'customFields']);
    });

    it('converts Zendesk fields into keys', () => {
      const ticket = {
        some_field: 'value',
        custom_fields: [
          { id: ZENDESK_FIELD_CUBYN_TRACKING_NUMBER.split(',')[1], value: 'the value' }
        ]
      };

      const zendeskTicket = ZendeskTicket.fromJson(ticket);
      expect(zendeskTicket.customFields.cubynTrackingNumber).to.equal('the value');
    });
  });
});
