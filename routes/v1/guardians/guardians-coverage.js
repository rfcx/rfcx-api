const express = require('express')
const router = express.Router()
const SensationsService = require('../../../services/legacy/sensations/sensations-service')
const executeService = require('../../../services/execute-service')
const passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
const hasRole = require('../../../middleware/authorization/authorization').hasRole

router.route('/:guardian_id/coverage')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const serviceReq = {
      guardian_id: req.params.guardian_id,
      starting_after: req.query.starting_after,
      ending_before: req.query.ending_before,
      interval: req.query.interval
    }

    executeService(req, res, serviceReq, SensationsService.getGuardianCoverage, 'Failed to create coverage.')
  })

module.exports = router
