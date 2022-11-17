/**
 * @param {Function} fn
 *
 * @returns {Promise<Error | void>}
 */
// eslint-disable-next-line consistent-return
async function asyncCatchError(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
}

/**
 * @param {Function} fn
 *
 * @returns {Promise<Error | void>}
 */
// eslint-disable-next-line consistent-return
function catchError(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
}

module.exports = { asyncCatchError, catchError };
