const express = require('express')
const router = express.Router()
const passport = require('passport')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const { ValidationError } = require('../../../common/error-handling/errors')
const pdfService = require('../../_services/pdf/pdf')
const sequelize = require('sequelize')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../common/converter')

router.route('/generate-with-pdfmake')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
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
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.error('e', e); httpErrorResponse(req, res, 500, e, 'Could not generate pdf from given object.') })
  })

module.exports = router
