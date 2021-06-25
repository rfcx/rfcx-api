const express = require('express')
const router = express.Router()
const sequelize = require('sequelize')
const moment = require('moment-timezone')
const passport = require('passport')
const httpError = require('../../../utils/http-errors.js')
const boxesService = require('../../../services/audio/boxes-service')
const ValidationError = require('../../../utils/converter/validation-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    req.query.limit = req.query.limit || 1000
    req.query.starting_after_local = req.query.starting_after_local || moment().subtract(1, 'months').startOf('day').toISOString()
    req.query.starting_before_local = req.query.starting_before_local || moment().endOf('day').toISOString()

    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('type').toString().isEqualToAny(['annotation'])

    return params.validate()
      .then(() => {
        return boxesService.getData(req)
          .then((data) => {
            boxesService.calculateTimeOffsetsInSeconds(data.labels)
            return data
          })
          .then((boxesData) => {
            return boxesService.formatBoxesAsTags(boxesData.labels)
          })
      })
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while getting tags'); console.log(e) })
  })

module.exports = router
