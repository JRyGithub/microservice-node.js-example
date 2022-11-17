const sinon = require('sinon');
const { expect } = require('chai');
const { CarotteEventBus } = require('.');
const { CarotteEvent } = require('../../events');

describe('adapters/carotte-event-bus', () => {
  let publish;
  let carotteEventBus;

  beforeEach(() => {
    publish = sinon.spy();
    carotteEventBus = new CarotteEventBus({ publish });
  });

  describe('when one event added', () => {
    beforeEach(() => {
      carotteEventBus.add(new CarotteEvent('topic/something.happened:v1', {}));
    });

    beforeEach(async () => {
      await carotteEventBus.publishAll();
    });

    it('should call inner publish()', () => {
      expect(publish).to.have.been.calledOnce;
    });
  });

  describe('when 3 events added', () => {
    beforeEach(() => {
      carotteEventBus.add(new CarotteEvent('topic/something.happened:v1', {}));
      carotteEventBus.add(new CarotteEvent('topic/something.happened:v1', {}));
      carotteEventBus.add(new CarotteEvent('topic/something.happened:v1', {}));
    });

    beforeEach(async () => {
      await carotteEventBus.publishAll();
    });

    it('should call inner publish() 3 times', () => {
      expect(publish).to.have.been.calledThrice;
    });
  });

  describe('when NO events added', () => {
    beforeEach(async () => {
      await carotteEventBus.publishAll();
    });

    it('should NOT call inner publish()', () => {
      expect(publish).to.not.have.been.called;
    });
  });
});
