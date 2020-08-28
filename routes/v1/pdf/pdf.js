var express = require('express')
var router = express.Router()
var passport = require('passport')
var httpError = require('../../../utils/http-errors')
var ValidationError = require('../../../utils/converter/validation-error')
var pdfService = require('../../../services/pdf/pdf')
var sequelize = require('sequelize')
var hasRole = require('../../../middleware/authorization/authorization').hasRole
var Converter = require('../../../utils/converter/converter')

router.route('/generate-with-pdfmake')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('dd').isObject()

    params.validate()
      .then(() => {
        return pdfService.printFromPDFMakeObj(transformedParams.dd)
      })
      .then((base64Str) => {
        res.send(base64Str)
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, 'Could not generate pdf from given object.') })
  })

module.exports = router
