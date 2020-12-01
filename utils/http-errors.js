var options = {

  400: {
    default: 'Missing required parameters'
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
  },

  403: {
    default: 'Not authorized to access this resource',
    user: 'Only users are authorized to access this resource'
  }

}

var httpError = function (req, res, code, context, mes) {
  var message = mes || (((context != null) && (options['' + code]['' + context] != null)) ? options['' + code]['' + context] : options['' + code].default)
  code = parseInt(code)
  var json = {
    message: message,
    error: {
      status: code
    }
  }
  var logger = code === 400 ? console.warn : console.error
  logger('Http error', { req: req.guid, message, context })
  res.status(parseInt(code)).json(json)
}

module.exports = httpError
