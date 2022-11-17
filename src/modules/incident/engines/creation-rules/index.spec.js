const { expect } = require('chai');
const {
  DeliveryPromiseCancelled
} = require('../../domain/creation-rule/delivery-promise-cancelled');
const {
  SkipIncidentCreationRuleOverride
} = require('../../domain/incident-creation-rule-override/skip');
const { CreationRulesEngine } = require('.');
const { MockIncidentCreationAction } = require('./tests/mock-incident-creation-action');
const { MockIncidentCreationDeniedError } = require('./tests/mock-incident-creation-denied-error');
const { MockIncidentCreationRule } = require('./tests/mock-incident-creation-rule');

describe('engines/creation-rules', () => {
  let context;
  let creationRules;
  let ruleOverrides;
  let creationRulesEngine;
  let result;

  async function call() {
    result = await creationRulesEngine.checkCreationRules({
      context,
      creationRules,
      ruleOverrides
    });
  }

  beforeEach(() => {
    context = {};
    creationRules = [];
    ruleOverrides = [];
    creationRulesEngine = new CreationRulesEngine();
  });

  describe('mocks', () => {
    describe('when first and only denies', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.DENY,
            new MockIncidentCreationDeniedError()
          )
        ];
      });

      it('should deny', async () => {
        await call();

        expect(result.allowed).to.be.false;
        expect(result.error).to.exist;
        expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
        expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
        expect(result.error.actions.length).to.equal(0);
      });
    });

    describe('when first and only denies with action', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.DENY,
            new MockIncidentCreationDeniedError({
              actions: [new MockIncidentCreationAction()]
            })
          )
        ];
      });

      it('should deny with action', async () => {
        await call();

        expect(result.allowed).to.be.false;
        expect(result.error).to.exist;
        expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
        expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
        expect(result.error.actions.length).to.equal(1);
        expect(result.error.actions[0]).to.be.instanceOf(MockIncidentCreationAction);
      });
    });

    describe('when first and only denies BUT rule skipped', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.DENY,
            new MockIncidentCreationDeniedError({
              actions: [new MockIncidentCreationAction()]
            })
          )
        ];
        ruleOverrides = [
          new SkipIncidentCreationRuleOverride({
            rule: MockIncidentCreationRule.RULE
          })
        ];
      });

      it('should allow', async () => {
        await call();

        expect(result.allowed).to.be.true;
        expect(result.error).to.not.exist;
      });
    });

    describe('when first and only allows', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.ALLOW
          )
        ];
      });

      it('should allow', async () => {
        await call();

        expect(result.allowed).to.be.true;
        expect(result.error).to.not.exist;
      });
    });

    describe('when fist and only continues', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.CONTINUE
          )
        ];
      });

      it('should allow', async () => {
        await call();

        expect(result.allowed).to.be.true;
        expect(result.error).to.not.exist;
      });
    });

    describe('when last continues', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.CONTINUE
          ),
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.CONTINUE
          ),
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.CONTINUE
          )
        ];
      });

      it('should allow', async () => {
        await call();

        expect(result.allowed).to.be.true;
        expect(result.error).to.not.exist;
      });
    });

    describe('when first allows and last denies', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.ALLOW
          ),
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.DENY,
            new MockIncidentCreationDeniedError()
          )
        ];
      });

      it('should allow', async () => {
        await call();

        expect(result.allowed).to.be.true;
        expect(result.error).to.not.exist;
      });
    });

    describe('when first continues and last denies', () => {
      beforeEach(() => {
        creationRules = [
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.CONTINUE
          ),
          new MockIncidentCreationRule({ returns: true }).onTrue(
            MockIncidentCreationRule.DECISIONS.DENY,
            new MockIncidentCreationDeniedError()
          )
        ];
      });

      it('should deny', async () => {
        await call();

        expect(result.allowed).to.be.false;
        expect(result.error).to.exist;
        expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
        expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
        expect(result.error.actions.length).to.equal(0);
      });
    });

    describe('subtrees', () => {
      describe('when subtree denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError()
              )
            ])
          ];
        });

        it('should deny', async () => {
          await call();

          expect(result.allowed).to.be.false;
          expect(result.error).to.exist;
          expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
          expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
          expect(result.error.actions.length).to.equal(0);
        });
      });

      describe('when subtree denies with action', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError({
                  actions: [new MockIncidentCreationAction()]
                })
              )
            ])
          ];
        });

        it('should deny with action', async () => {
          await call();

          expect(result.allowed).to.be.false;
          expect(result.error).to.exist;
          expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
          expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
          expect(result.error.actions.length).to.equal(1);
          expect(result.error.actions[0]).to.be.instanceOf(MockIncidentCreationAction);
        });
      });

      describe('when subtree allows', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.ALLOW
              )
            ])
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });

      describe('when last in subtree continues', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              )
            ])
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });

      describe('when first in subtree allows and last denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.ALLOW
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError()
              )
            ])
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });

      describe('when first in subtree continues and last denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError()
              )
            ])
          ];
        });

        it('should deny', async () => {
          await call();

          expect(result.allowed).to.be.false;
          expect(result.error).to.exist;
          expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
          expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
          expect(result.error.actions.length).to.equal(0);
        });
      });

      describe('when first allows and subtree denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.ALLOW
            ),
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError()
              )
            ])
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });

      describe('when first continues and subtree denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.CONTINUE
            ),
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.DENY,
                new MockIncidentCreationDeniedError()
              )
            ])
          ];
        });

        it('should deny', async () => {
          await call();

          expect(result.allowed).to.be.false;
          expect(result.error).to.exist;
          expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
          expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
          expect(result.error.actions.length).to.equal(0);
        });
      });

      describe('when subtree continues and last denies', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.CONTINUE
            ),
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              )
            ]),
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.DENY,
              new MockIncidentCreationDeniedError()
            )
          ];
        });

        it('should deny', async () => {
          await call();

          expect(result.allowed).to.be.false;
          expect(result.error).to.exist;
          expect(result.error).to.be.instanceOf(MockIncidentCreationDeniedError);
          expect(result.error.reason).to.equal(MockIncidentCreationDeniedError.REASON);
          expect(result.error.actions.length).to.equal(0);
        });
      });

      describe('when subtree continues and last continues', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.CONTINUE
            ),
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              )
            ]),
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.CONTINUE
            )
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });

      describe('when subtree continues and last allows', () => {
        beforeEach(() => {
          creationRules = [
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.CONTINUE
            ),
            new MockIncidentCreationRule({ returns: true }).onTrue([
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              ),
              new MockIncidentCreationRule({ returns: true }).onTrue(
                MockIncidentCreationRule.DECISIONS.CONTINUE
              )
            ]),
            new MockIncidentCreationRule({ returns: true }).onTrue(
              MockIncidentCreationRule.DECISIONS.ALLOW
            )
          ];
        });

        it('should allow', async () => {
          await call();

          expect(result.allowed).to.be.true;
          expect(result.error).to.not.exist;
        });
      });
    });
  });

  describe('real', () => {
    /**
     * TODO: add real cases for each incident type
     */

    describe('when CASE#1', () => {
      beforeEach(() => {
        context = { deliveryPromise: { status: 'CANCELLED' } };
        creationRules = [new DeliveryPromiseCancelled()];
        ruleOverrides = [];
      });

      it('should DO', async () => {
        await call();

        expect(result.allowed).to.be.true;
      });
    });

    describe('when CASE#2', () => {
      beforeEach(() => {
        context = { deliveryPromise: { status: 'RUNNING' } };
        creationRules = [new DeliveryPromiseCancelled()];
        ruleOverrides = [];
      });

      it('should DO', async () => {
        await call();

        expect(result.allowed).to.be.true;
      });
    });
  });
});
