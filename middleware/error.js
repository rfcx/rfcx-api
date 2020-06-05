const loggers = require('../utils/logger')

function notFound (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
}

function exceptionOccurred (err, req, res, next) {
  var status = err.status || 500
  loggers.errorLogger.log('Express.js error handler', { req: req, url: req.url, status: status, err: err })
  res.status(status).json({
    message: err.message,
    error: err
  })
}

module.exports = { notFound, exceptionOccurred }