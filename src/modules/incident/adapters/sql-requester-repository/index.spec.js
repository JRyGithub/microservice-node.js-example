const { expect } = require('chai');
const { createRequester } = require('../../domain/requester');
const IncidentRequesterModel = require('../../../models/incident-requester');
const { SqlRequesterRepository } = require('.');

const aRequester = (overrides = {}) =>
  createRequester({
    firstName: 'First name',
    lastName: 'Test one last name requester',
    email: 'testone@cubyn.com',
    ...overrides
  });

describe('adapters/sql-requester-repository', () => {
  let repository;

  beforeEach(() => {
    repository = new SqlRequesterRepository();
  });

  afterEach(async () => {
    await IncidentRequesterModel.query().delete();
  });

  describe('create', () => {
    it('should create requester', async () => {
      const requester = aRequester();

      await repository.create(requester);

      const models = await IncidentRequesterModel.query();
      expect(models).to.have.length(1);
      const [model] = models;
      expect(model.firstName).to.eql(requester.firstName);
    });

    describe('when language is NOT provided', () => {
      it('should NOT store language', async () => {
        const requester = aRequester();

        await repository.create(requester);

        const models = await IncidentRequesterModel.query();
        expect(models).to.have.length(1);
        const [model] = models;
        expect(model.language).to.not.exist;
      });
    });

    describe('when language provided', () => {
      it('should store language', async () => {
        const language = 'en';
        const requester = aRequester({ language });

        await repository.create(requester);

        const models = await IncidentRequesterModel.query();
        expect(models).to.have.length(1);
        const [model] = models;
        expect(model.language).to.equal(language);
      });
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      const requesters = [
        aRequester({
          id: '10001',
          firstName: 'Test one first name requester',
          lastName: 'Test one last name requester',
          email: 'testone@cubyn.com'
        }),
        aRequester({
          id: '10002',
          firstName: 'Test two first name requester',
          lastName: 'Test two last name requester',
          email: 'testtwo@cubyn.com'
        })
      ];

      await Promise.all(requesters.map((requester) => repository.create(requester)));
    });

    it('should filter requesters by id', async () => {
      const results = await repository.query({ id: 10002 });

      expect(results).to.have.length(1);
      expect(results.map(({ id }) => id)).to.eql([10002]);
    });
  });

  describe('findById', () => {
    let requesterId;
    let language;

    describe('when language is NOT provided', () => {
      beforeEach(async () => {
        language = undefined;
        const requester = aRequester({
          id: '10001',
          firstName: 'Test two first name requester',
          lastName: 'Test two last name requester',
          email: 'testtwo@cubyn.com',
          language
        });

        const createdRequester = await repository.create(requester);
        requesterId = createdRequester.id;
      });

      it('should return requester WITHOUT provided', async () => {
        const foundRequester = await repository.findById(requesterId);

        expect(foundRequester).to.exist;
        expect(foundRequester.language).to.not.exist;
      });
    });

    describe('when language provided', () => {
      beforeEach(async () => {
        language = 'env';
        const requester = aRequester({
          id: '10001',
          firstName: 'Test two first name requester',
          lastName: 'Test two last name requester',
          email: 'testtwo@cubyn.com',
          language
        });

        const createdRequester = await repository.create(requester);
        requesterId = createdRequester.id;
      });

      it('should return requester WITHOUT provided', async () => {
        const foundRequester = await repository.findById(requesterId);

        expect(foundRequester).to.exist;
        expect(foundRequester.language).to.equal(language);
      });
    });
  });
});
