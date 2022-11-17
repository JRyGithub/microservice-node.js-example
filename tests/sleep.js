/**
 * @param {number} ms time to sleep in milliseconds
 */
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

module.exports = { sleep };
