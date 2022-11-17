/* eslint-disable */

/**
 * Simple chai plugin to assert that all objects of an array
 * match expectedArray, in the same order
 *
 * e.g.
 *  expect([
 *    { a: 1, b: 2 },
 *    { a: 2, b: 12 },
 *    { a: 3, b: 22 },
 *  ]).to.includeArrayObjects([
 *    { a: 1 },
 *    { b: 12 },
 *    { a: 3 },
 *  ])
 */
module.exports = (chai, utils) => {
  const { Assertion } = chai;

  utils.addMethod(
    Assertion.prototype,
    'includeArrayObjects',
    function equalInAnyOrder(expectedArray, userMessage) {
      const testedArray = this.__flags.object;
      const negate = this.__flags.negate;
      const message = userMessage || this.__flags.message;

      new Assertion(testedArray).to.be.an('array');

      if (!Array.isArray(expectedArray)) {
        throw new Error('expected is not an array');
      }

      new Assertion(testedArray).to.have.length(expectedArray.length);

      if (negate) {
        throw new Error('negation not supported for includeArrayObjects');
      }

      expectedArray.forEach((expectedObject, index) =>
        new Assertion(testedArray[index], message).to.deep.include(expectedObject)
      );
    }
  );
};
