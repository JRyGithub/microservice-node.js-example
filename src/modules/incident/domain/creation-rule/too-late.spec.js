const { expect } = require('chai');
const {
  TooLateIncidentCreationDeniedError
} = require('../incident-creation-denied-error/too-late');
const { IncidentCreationRule } = require('./abstract');
const { TooLate } = require('./too-late');
const { INCIDENT_TYPES } = require('../incident/constants/incident-types');
const { BaseIncident } = require('../incident/base');

describe('creation-rule/too-late', () => {
  let days;
  let currentDate;
  let parcel;
  let incidentType;
  let similarIncidents;

  beforeEach(() => {
    days = 7;
    parcel = {
      deliveredAt: new Date('2021-01-01').toISOString()
    };
    currentDate = new Date('2021-01-02');
    incidentType = INCIDENT_TYPES.PARCEL_RECEIVED_DAMAGED;
    similarIncidents = [];
  });

  async function runRule() {
    return new TooLate({ days }).run({ parcel, currentDate, incidentType, similarIncidents });
  }

  function itShouldContinue() {
    it('should continue', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.CONTINUE);
    });
  }

  function itShouldDeny() {
    it('should deny', async () => {
      const result = await runRule();

      expect(result.decision).to.equal(IncidentCreationRule.DECISIONS.DENY);
      expect(result.error).to.be.instanceOf(TooLateIncidentCreationDeniedError);
    });
  }

  describe('when parcel does NOT exist', () => {
    beforeEach(() => {
      parcel = undefined;
    });

    itShouldDeny();
  });

  describe('when deliveredAt before does NOT exist', () => {
    beforeEach(() => {
      parcel.deliveredAt = undefined;
    });

    itShouldDeny();
  });

  describe('when currentDate is NOT less or equal then deliveredAt before + days', () => {
    beforeEach(() => {
      days = 7;
      parcel.deliveredAt = new Date('2021-01-01').toISOString();
      currentDate = new Date('2021-01-10');
    });

    itShouldDeny();
  });

  describe('when currentDate is NOT less or equal then similar incidents before + days', () => {
    beforeEach(() => {
      days = 7;
      similarIncidents = [
        { updatedAt: new Date('2021-01-01').toISOString(), status: BaseIncident.STATUSES.REJECTED }
      ];
      currentDate = new Date('2021-01-10');
    });

    itShouldDeny();
  });

  describe('when currentDate is NOT less or equal then Max of deliveredAt or similarIncident updated before + days (updatedAt)', () => {
    beforeEach(() => {
      days = 7;
      parcel.deliveredAt = new Date('2021-01-01').toISOString();
      similarIncidents = [
        { updatedAt: new Date('2021-01-02').toISOString(), status: BaseIncident.STATUSES.REJECTED }
      ];
      currentDate = new Date('2021-01-10');
    });

    itShouldDeny();
  });

  describe('when currentDate is NOT less or equal then Max of deliveredAt or similarIncident updated before + days (deliveredAt)', () => {
    beforeEach(() => {
      days = 7;
      parcel.deliveredAt = new Date('2021-01-02').toISOString();
      similarIncidents = [
        { updatedAt: new Date('2021-01-01').toISOString(), status: BaseIncident.STATUSES.REJECTED }
      ];
      currentDate = new Date('2021-01-10');
    });

    itShouldDeny();
  });

  describe('when currentDate is less or equal then similar incidents before + days', () => {
    beforeEach(() => {
      days = 7;
      similarIncidents = [
        { updatedAt: new Date('2021-01-01').toISOString(), status: BaseIncident.STATUSES.REJECTED }
      ];
      currentDate = new Date('2021-01-07');
    });

    itShouldContinue();
  });

  describe('when currentDate is less or equal then Max of deliveredAt or similarIncident updated before + days', () => {
    beforeEach(() => {
      days = 7;
      parcel.deliveredAt = new Date('2021-01-01').toISOString();
      similarIncidents = [
        { updatedAt: new Date('2021-01-05').toISOString(), status: BaseIncident.STATUSES.REJECTED }
      ];
      currentDate = new Date('2021-01-10');
    });

    itShouldContinue();
  });

  describe('when PARCEL_NEVER_RECEIVED type should allow you to create an incident', () => {
    beforeEach(() => {
      days = 7;
      currentDate = new Date();
      incidentType = INCIDENT_TYPES.PARCEL_NEVER_RECEIVED;
    });

    itShouldContinue();
  });

  describe('when everything is OK', () => {
    itShouldContinue();
  });
});
