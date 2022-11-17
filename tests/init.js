/* eslint-disable no-console */
const chai = require('chai');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('MESSAGE', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.log('MESSAGE', err);
  process.exit(1);
});

process.env.NODE_ENV = 'test';

chai.use(require('chai-as-promised'));
chai.use(require('chai-properties'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('./chai-array-objects'));

dotenv.config({ path: '.env.test' });

global.expect = chai.expect;
