const { Model } = require('objection');
const {
  defaultHealthchecks,
  defaultTeardowns,
  defaultMetrics
} = require('@devcubyn/carotte-runtime');
const env = require('../env');

// eslint-disable-next-line import/order
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_DATABASE,
    typeCast: (field, next) => {
      if (field.type === 'TINY' && field.length === 1) {
        return field.string() === '1';
      }

      return next();
    }
  }
});

Model.knex(knex);

/**
 * http://vincit.github.io/objection.js/#defaulteageralgorithm
 * JoinEagerAlgorithm: performs one query `select ... from a inner join b`
 * WhereInEagerAlgorithm:  splits in multiple `where in ...` queries
 */
// Model.defaultEagerAlgorithm = Model.JoinEagerAlgorithm; /!\ does not support order / limit
Model.defaultEagerAlgorithm = Model.WhereInEagerAlgorithm;

const mysqlTeardown = {
  name: 'mysql',
  teardown: () => defaultTeardowns.knex(knex),
  timeout: env.CAROTTE_TEARDOWN_MYSQL_TIMEOUT
};
const mysqlHealthcheck = defaultHealthchecks.mysql(knex);
const knexPoolMetric = defaultMetrics.knexPool(knex);

module.exports = { knex, ObjectionModel: Model, mysqlHealthcheck, mysqlTeardown, knexPoolMetric };
