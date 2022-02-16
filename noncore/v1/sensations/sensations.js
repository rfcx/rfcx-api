const express = require('express')
const router = express.Router()
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const requireUser = require('../../../common/middleware/authorization/authorization').requireTokenType('user')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const sensationsService = require('../../_services/legacy/sensations/sensations-service')
const { ValidationError } = require('../../../common/error-handling/errors')

router.route('/')
  .post(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    // map HTTP params to service params
    const serviceParams = {
      source_type: req.body.source_type,
      source_id: req.body.source_id,
      data_type: req.body.data_type,
      data_id: req.body.data_id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      starting_after: req.body.starting_after,
      ending_before: req.body.ending_before
    }

    // call service and deal with success & failure
    sensationsService.createSensations(serviceParams)
      .then(result => res.status(200).json(result))
      // if the user supplied wrong arguments we want to give an error message and have a 400 error code
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      // catch-all for any other that is not based on user input
      .catch(e => httpErrorResponse(req, res, 500, e, "Sensations couldn't be created."))
  })

module.exports = router
