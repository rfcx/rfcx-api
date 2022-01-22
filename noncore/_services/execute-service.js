const util = require('util')
const { httpErrorResponse } = require('../../common/error-handling/http')
const ValidationError = require('../../utils/converter/validation-error')

module.exports = function (req, res, serviceRequest, serviceFunction, message = 'Failed') {
  serviceFunction(serviceRequest)
    .then(
      result => res.status(200).json(result)
    )
    .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
    .catch(function (err) {
      console.log(`${message} | ` + err +
        '| params: ' + util.inspect(req.params, false, null) +
        '| query: ' + util.inspect(req.query, false, null) +
        '| body: ' + util.inspect(req.body, false, null))
      httpErrorResponse(req, res, 500, err, message)
    })
}
