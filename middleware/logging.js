const winston = require('winston')
const expressWinston = require('express-winston')
const loggers = require('../utils/logger')

module.exports = expressWinston.logger({
  winstonInstance: loggers.expressLogger,
  expressFormat: true,
  level: 'info',
  requestWhitelist: ['guid', 'instance', 'url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body', 'files'],
  responseWhitelist: ['body'],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  ignoreRoute: function (req) {
    if (req.url === '/health_check') return true
    return false
  }
})
