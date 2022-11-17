/**
 * **Mutating** incidents directly to update attachment urls
 *
 * @param {Incident[]} incidents
 * @param {Object} dependencies
 * @param {FileRepository} dependencies.fileRepository
 * @returns {Promise<void>}
 */
async function hydrateIncidentsUrls(incidents, { fileRepository }) {
  const fileKeys = incidents.reduce((memo, { attachments }) => {
    memo.push(...(attachments || []).map((attachment) => attachment.fileKey));

    return memo;
  }, []);

  const urlsByKey = await fileRepository.findUrls(fileKeys);

  incidents.forEach((incident) => {
    if (incident.attachments) {
      incident.attachments.forEach((attachment) => {
        // eslint-disable-next-line no-param-reassign
        attachment.url = urlsByKey[attachment.fileKey] || null;
      });
    }
  });
}

module.exports = { hydrateIncidentsUrls };
