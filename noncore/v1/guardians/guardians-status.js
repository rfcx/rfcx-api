const models = require('../../_models')
const express = require('express')
const router = express.Router()
const queryHelpers = require('../../_utils/rfcx-query')
const httpError = require('../../../utils/http-errors.js')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole

router.route('/:guardian_id/status')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        return queryHelpers.guardianStatusAudio.allCoverage(dbGuardian.id, 3).then(function (coverageResult) {
          return queryHelpers.guardianStatusMeta.allTotalDataTransfer(dbGuardian.id, 3).then(function (dataTransferResult) {
            return queryHelpers.guardianStatusCheckIns.checkInSummary(dbGuardian.id, 3).then(function (checkInSummaryResult) {
              res.status(200).json({
                guardian: {},
                audio: {
                  coverage_percent: coverageResult
                },
                meta: {
                  data_transfer: dataTransferResult
                },
                checkins: checkInSummaryResult.checkins
              })

              return null
            })
          })
        })
      }).catch(function (err) {
        console.log('failure to retrieve guardian: ' + err)
        httpError(req, res, 404, 'database')
      })
  })

module.exports = router
