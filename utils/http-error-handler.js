const httpError = require('./http-errors')
const ValidationError = require('./converter/validation-error')
const ForbiddenError = require('./converter/forbidden-error')
const EmptyResultError = require('./converter/empty-result-error')
const UnauthorizedError = require('./converter/unauthorized-error')

function httpErrorHandler (req, res, fallbackMessage) {
  return (err) => {
    if (err instanceof ValidationError) {
      return httpError(req, res, 400, null, err.message)
    }
    if (err instanceof ForbiddenError) {
      return httpError(req, res, 403, null, err.message)
    }
    if (err instanceof EmptyResultError) {
      return httpError(req, res, 404, null, err.message)
    }
    console.log(err)
    return httpError(req, res, 500, err, fallbackMessage)
  }
}

function rpErrorMatcher (err) {
  try {
    const statusCode = err.response.statusCode
    let message
    try {
      message = err.response.body.message
    } catch (mesErr) {
      message = err.message
    }
    switch (statusCode) {
      case 400:
        return new ValidationError(message)
      case 401:
        return new UnauthorizedError(message)
      case 403:
        return new ForbiddenError(message)
      case 404:
        return new EmptyResultError(message)
      default:
        return err
    }
  } catch (e) {
    return err
  }
}

module.exports = {
  httpErrorHandler,
  rpErrorMatcher
}
