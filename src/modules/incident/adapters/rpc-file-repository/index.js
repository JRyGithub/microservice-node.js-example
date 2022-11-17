const FILE_LINK_TTL_SECONDS = 3600;

class RpcFileRepository {
  constructor(invoke) {
    this.invoke = invoke;
  }

  /**
   * @param {string[]} keys array of file keys
   * @param {Object} options
   * @param {number} options.ttl url ttl in seconds
   * @returns {Promise<Record<string, string|null>>} null if given key resolves to no file
   */
  async findUrls(keys, { ttl = FILE_LINK_TTL_SECONDS } = {}) {
    const urlsByKeys = {};

    if (!keys || !keys.length) {
      return urlsByKeys;
    }

    const files = await this.invoke('file.list:v1', {
      filters: { key: keys },
      ttl
    });

    const filesByKey = files.reduce((memo, file) => {
      // eslint-disable-next-line no-param-reassign
      memo[file.key] = file;

      return memo;
    }, {});

    keys.forEach((key) => {
      urlsByKeys[key] = key in filesByKey ? filesByKey[key].url : null;
    });

    return urlsByKeys;
  }
}

module.exports = { RpcFileRepository };
