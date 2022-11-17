const { ResourceNotFoundError } = require('@devcubyn/core.errors');
const sinon = require('sinon');
const { expect } = require('chai');
const { handler: lambda } = require('.');

describe('controllers/incidents.read:v1', () => {
  const EMPTY_INCIDENT = { attachments: [] };

  describe('success path', () => {
    it('should forward to list controller', async () => {
      const invoke = sinon.spy(async () => ({ items: [EMPTY_INCIDENT], count: 1 }));

      const result = await lambda({
        data: {
          params: { id: 10001 }
        },
        invoke
      });

      expect(result.body).to.eql(EMPTY_INCIDENT);
      expect(invoke).to.have.been.calledOnce;
      expect(invoke).to.have.been.calledWith('incident.list:v1', {
        filters: { id: 10001 },
        includes: []
      });
    });
  });

  describe('error path', () => {
    describe('when lambda does NOT return an array with single item', () => {
      it('should throw ResourceNotFoundError', async () => {
        const invoke = sinon.spy(async () => ({
          items: [EMPTY_INCIDENT, EMPTY_INCIDENT],
          count: 1
        }));

        try {
          await lambda({
            data: {
              params: { id: 10001 }
            },
            invoke
          });
        } catch (error) {
          expect(error).to.be.instanceOf(ResourceNotFoundError);
        }
      });
    });
  });
});
