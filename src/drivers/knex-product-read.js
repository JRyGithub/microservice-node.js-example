const env = require('../env');
module.exports = require('knex')({
  client: 'mysql2',
  connection: {
    host: env.DB_PRODUCT_READ_HOST,
    port: env.DB_PRODUCT_READ_PORT,
    user: env.DB_PRODUCT_READ_USER,
    password: env.DB_PRODUCT_READ_PASS
  }
});
