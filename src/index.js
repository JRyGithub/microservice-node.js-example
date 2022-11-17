require('dotenv').config();
const { runtime, nodeJsVersionMetric, carotteRuntimeVersionMetric } = require('./drivers/carotte');
const logger = require('./drivers/logger');
const { mysqlHealthcheck, mysqlTeardown, knexPoolMetric } = require('./drivers/mysql');

(async () => {
  try {
    runtime.healthcheck.use('mysql', () => mysqlHealthcheck());
    runtime.teardown.use(mysqlTeardown);
    runtime.metric.use(knexPoolMetric).use(nodeJsVersionMetric).use(carotteRuntimeVersionMetric);

    await runtime.start();
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
})();
