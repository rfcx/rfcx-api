const express = require('express')
const router = express.Router()
const checkInHelpers = require('../../_utils/rfcx-checkin')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')

const guardianMsgParsingUtils = require('../../_utils/rfcx-guardian/guardian-msg-parsing-utils').guardianMsgParsingUtils
const pingRouter = require('../../_utils/rfcx-guardian/router-ping').pingRouter
const guidService = require('../../../utils/misc/guid')

router.route('/:guardian_id/pings')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    // unzip gzipped meta json blob
    checkInHelpers.gzip.unZipJson(req.body.json)
      .bind({})
      .then(function (json) {
        let messageId = guidService.generate()

        const pingObj = guardianMsgParsingUtils.constructGuardianMsgObj(json, req.params.guardian_id, req.headers['x-auth-token'])

        pingRouter.onMessagePing(pingObj, messageId)
          .then((result) => {
            res.status(200).json(result.obj)

            console.log('rest message processed', messageId)
            messageId = null
            result = null
            return true
          })

          .catch(ValidationError, function (err) {
            httpErrorResponse(req, res, 400, null, err.message)
          })
          .catch(sequelize.EmptyResultError, function (err) {
            console.error('Failed to save ping', err)
            httpErrorResponse(req, res, 404, null, err.message)
          })
          .catch(function (err) {
            console.error('Failed to save ping', err)
            httpErrorResponse(req, res, 500, err, 'failed to save ping')
          })
      })
      .catch(function (err) {
        console.error('Failed to unzip json', err)
        httpErrorResponse(req, res, 500, err, 'failed to unzip json')
      })
  })

module.exports = router
