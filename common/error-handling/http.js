const { ValidationError, ForbiddenError, EmptyResultError, UnauthorizedError, ConflictError } = require('./errors')

const options = {
  400: {
    default: 'Missing required parameters'
  },
  403: {
    default: 'Not authorized to access this resource',
    user: 'Only users are authorized to access this resource'
  },
  404: {
    default: 'Not Found',
    database: 'Record Not Found'
  },
  409: {
    default: 'Conflict',
    database: 'Record already exists'
  },
  500: {
    default: 'Internal Server Error',
    database: 'Server Error While Retrieving Data',
    parse: 'Failed to parse input'
  },
  501: {
    default: 'Not Implemented'
  }
}

function httpErrorResponse (req, res, code, context, mes) {
  const message = mes || (((context != null) && (options['' + code]['' + context] != null)) ? options['' + code]['' + context] : options['' + code].default)
  code = parseInt(code)
  const json = {
    message: message,
    error: {
      status: code
    }
  }
  const logger = code >= 400 && code <= 499 ? console.warn : console.error
  logger(`Http handler: request ${req.guid}, message "${message}", context ${JSON.stringify(context)}`)
  res.status(code).json(json)
}

function httpErrorHandler (req, res, fallbackMessage = 'Internal Server Error') {
  return (err) => {
    if (err instanceof ValidationError) {
      return httpErrorResponse(req, res, 400, null, err.message)
    }
    if (err instanceof ForbiddenError) {
      return httpErrorResponse(req, res, 403, null, err.message)
    }
    if (err instanceof EmptyResultError) {
      return httpErrorResponse(req, res, 404, null, err.message)
    }
    if (err instanceof ConflictError) {
      return httpErrorResponse(req, res, 409, null, err.message)
    }
    console.error('httpErrorHandler', err)
    return httpErrorResponse(req, res, 500, err, fallbackMessage)
  }
}

function rpErrorHandler () {
  return err => {
    try {
      const statusCode = err.response.statusCode
      let message
      try { // TODO Refactor double layer of try-catch
        message = err.response.body.message
      } catch (mesErr) {
        message = err.message
      }
      switch (statusCode) {
        case 400:
          throw new ValidationError(message)
        case 401:
          throw new UnauthorizedError(message)
        case 403:
          throw new ForbiddenError(message)
        case 404:
          throw new EmptyResultError(message)
        default:
          throw err
      }
    } catch (e) {
      throw err
    }
  }
}

module.exports = {
  httpErrorResponse,
  httpErrorHandler,
  rpErrorHandler
}
