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
  500: {
    default: 'Internal Server Error',
    database: 'Server Error While Retrieving Data',
    parse: 'Failed to parse input'
  },
  501: {
    default: 'Not Implemented'
  }
}

function httpError (req, res, code, context, mes) {
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

module.exports = httpError
