/**
 * Tries to rollback provided transaction.
 * Returns boolean describing successfulness
 *
 * @param {import('objection').Transaction} trx
 * @returns {boolean}
 */
async function tryToRollback(trx) {
  try {
    await trx.rollback();

    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { tryToRollback };
