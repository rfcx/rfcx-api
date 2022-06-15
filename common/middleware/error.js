
function notFound (req, res, next) {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
}

function exceptionOccurred (err, req, res, next) {
  const status = err.status || 500
  const isError = status >= 500
  const loggerType = isError ? 'error' : 'warn'
  const log = {
    req: req.guid,
    url: req.url,
    status: status,
    ...isError ? { err } : {}
  }
  console[loggerType]('Express.js handler', log)
  res.status(status).json({
    message: err.message,
    error: err
  })
}

module.exports = { notFound, exceptionOccurred }
