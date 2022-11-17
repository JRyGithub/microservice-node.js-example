/* eslint-disable max-classes-per-file */
/**
 * @interface TransientLogger
 */
class TransientContextualizedLogger {
  /**
   * @param {Object} param
   * @param {string | undefined} param.scope
   * @param {import('@devcubyn/carotte-runtime').Context} param.context
   * @param {import('winston').LoggerInstance} param.innerLogger
   */
  constructor({ scope, context, innerLogger }) {
    /**
     * @private
     * @type {string | undefined}
     */
    this.scope = scope;
    /**
     * @private
     * @type {import('@devcubyn/carotte-runtime').Context}
     */
    this.context = context;
    /**
     * @private
     * @type {import('winston').LoggerInstance}
     */
    this.innerLogger = innerLogger;
  }

  error(message, meta) {
    this.callInner('error', message, meta);
  }

  warn(message, meta) {
    this.callInner('warn', message, meta);
  }

  info(message, meta) {
    this.callInner('info', message, meta);
  }

  debug(message, meta) {
    this.callInner('debug', message, meta);
  }

  /**
   * @private
   * @param {'error' | 'warn' | 'info' | 'debug'} method
   * @param {string} message
   * @param {any | void} meta
   */
  callInner(method, message, meta = {}) {
    this.innerLogger[method](message, { ...meta, context: this.context, scope: this.scope });
  }
}

class TransientContextualizedLoggerFactory {
  /**
   * @param {Object} param
   * @param {import('@devcubyn/carotte-runtime').Context} param.context
   * @param {import('winston').LoggerInstance} param.innerLogger
   */
  constructor({ context, innerLogger }) {
    /**
     * @private
     * @type {import('@devcubyn/carotte-runtime').Context}
     */
    this.context = context;
    /**
     * @private
     * @type {import('winston').LoggerInstance}
     */
    this.innerLogger = innerLogger;
  }

  create(scope) {
    return new TransientContextualizedLogger({
      scope,
      context: this.context,
      innerLogger: this.innerLogger
    });
  }
}

module.exports = { TransientContextualizedLoggerFactory };
