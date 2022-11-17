// eslint-disable-next-line no-unused-vars
const { TrustpilotInvitation } = require('../../domain/trustpilot-invitation');

class InvitationBulkFetchingEngine {
  constructor({ trustpilotInvitationRepository, envHost, loggerFactory }) {
    this.trustpilotInvitationRepository = trustpilotInvitationRepository;
    this.envHost = envHost;
    this.logger = loggerFactory.create('InvitationBulkFetchingEngine');
  }

  /**
   * @param {Object} param
   * @param {number | void} param.processLimit
   * @returns {() => AsyncGenerator<TrustpilotInvitation[]>}
   */
  createProcessingAsyncGenerator({ processLimit = 0 }) {
    const self = this;

    // eslint-disable-next-line func-names
    return async function* () {
      const bulkSize = self.envHost.get().TRUSTPILOT_PROCESS_BULK_SIZE;
      const ids = await self.trustpilotInvitationRepository.findAllProcessingIds(processLimit);

      const maxIterationsCount = Math.ceil(ids.length / bulkSize);
      let iterationCount = 0;

      self.logger.debug(
        `Start fetching processing trustpilot invitations, bulk size: ${bulkSize}, all count: ${ids.length}, max iterations count: ${maxIterationsCount}`
      );

      while (iterationCount < maxIterationsCount) {
        const start = iterationCount * bulkSize;
        const end = start + bulkSize;
        const idsToTake = ids.slice(start, end);
        const bulk = await self.trustpilotInvitationRepository.findManyByIds(idsToTake);

        yield bulk;

        iterationCount++;
      }

      self.logger.debug('Stop fetching processing trustpilot invitations, run out of bulks');
    };
  }
}

module.exports = { InvitationBulkFetchingEngine };
