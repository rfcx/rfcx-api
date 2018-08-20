const redis = require('redis');
const bluebird = require("bluebird");
const loggers = require('./logger');

bluebird.promisifyAll(redis);

let client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
})

client.on('ready', () => {
  loggers.debugLogger.log('Redis: ready');
});

client.on('connect', () => {
  loggers.debugLogger.log(`Redis: connected to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
});

client.on('reconnecting', () => {
  loggers.debugLogger.log(`Redis: reconnecting to ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
});

client.on('error', (err) => {
  loggers.debugLogger.log(`Redis: error`, { err });
  loggers.errorLogger.log(`Redis: error`, { err });
});

module.exports = client;
