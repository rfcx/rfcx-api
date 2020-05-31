const toobusy = require('toobusy-js')
const loggers = require('../utils/logger')

module.exports = function (req, res, next) {
  if (toobusy()) {
    loggers.errorLogger.log('Server is too busy to handle request', {
      req: req, info: {
        url: req.url,
        body: req.body
      }
    })
  }
  next()
}