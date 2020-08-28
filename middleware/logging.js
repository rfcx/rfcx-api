const winston = require('winston')
const expressWinston = require('express-winston')
const loggers = require('../utils/logger')

module.exports = expressWinston.logger({
  winstonInstance: loggers.expressLogger,
  expressFormat: true,
  level: 'info',
  requestWhitelist: ['guid', 'instance', 'url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body', 'files'],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  requestFilter: function (req, propName) {
    if (propName === 'headers') {
      // remove user token from logging for security reasons
      delete req.headers['x-auth-token']
    }
    if (propName === 'body') {
      // delete password from login body
      delete req.body.password
    }
    return req[propName]
  },
  ignoreRoute: function (req) {
    if (req.url === '/health_check') return true
    return false
  }
})
