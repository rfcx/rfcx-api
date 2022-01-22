const express = require('express')
const router = express.Router()
const sequelize = require('sequelize')
const moment = require('moment-timezone')
const passport = require('passport')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const eventsServiceNeo4j = require('../../_services/legacy/events/events-service-neo4j')
const boxesService = require('../../_services/audio/boxes-service')
const { ValidationError } = require('../../../common/error-handling/errors')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    req.query.limit = req.query.limit || 1000
    req.query.starting_after_local = req.query.starting_after_local || moment().subtract(1, 'months').startOf('day').toISOString()
    req.query.starting_before_local = req.query.starting_before_local || moment().endOf('day').toISOString()

    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('type').toString().isEqualToAny(['annotation', 'inference', 'inference:confirmed', 'inference:rejected'])

    return params.validate()
      .then(() => {
        if (['inference', 'inference:confirmed', 'inference:rejected'].includes(req.query.type)) {
          if (['inference:confirmed', 'inference:rejected'].includes(req.query.type)) {
            req.query.reviewed = 'true'
          }
          // Set include_windows true by default for this endpoint
          req.query.include_windows = req.query.include_windows !== undefined ? req.query.include_windows : 'true'
          return eventsServiceNeo4j.queryData(req)
            .bind({})
            .then((eventsData) => {
              this.eventsData = eventsData
              return eventsServiceNeo4j.formatEventsAsTags(eventsData.events, req.query.type)
            })
            .then((tags) => {
              return tags
            })
        } else {
          return boxesService.getData(req)
            .then((data) => {
              boxesService.calculateTimeOffsetsInSeconds(data.labels)
              return data
            })
            .then((boxesData) => {
              return boxesService.formatBoxesAsTags(boxesData.labels)
            })
        }
      })
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting tags'); console.log(e) })
  })

module.exports = router
