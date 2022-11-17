const { CarotteRuntimeBuilder, defaultMetrics } = require('@devcubyn/carotte-runtime');
const logger = require('./logger');

exports.nodeJsVersionMetric = defaultMetrics.nodeJsVersion();
exports.carotteRuntimeVersionMetric = defaultMetrics.carotteRuntimeVersion();

exports.runtime = CarotteRuntimeBuilder({ logger });
