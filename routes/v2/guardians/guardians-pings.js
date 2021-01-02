var models = require('../../../models')
var express = require('express')
var router = express.Router()
var views = require('../../../views/v1')
var checkInHelpers = require('../../../utils/rfcx-checkin')
const queueForPrediction = require('../../../utils/rfcx-analysis/queue-for-prediction')
var httpError = require('../../../utils/http-errors.js')
var passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
var Promise = require('bluebird')
var sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')
const strArrToJSArr = checkInHelpers.audio.strArrToJSArr

var guardianMsgParsingUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils
var pingRouter = require('../../../utils/rfcx-guardian/router-ping.js').pingRouter
const guidService = require('../../../utils/misc/guid.js')

router.route('/:guardian_id/pings')
  .post(passport.authenticate('token', { session: false }), function (req, res) {

    // unzip gzipped meta json blob
    checkInHelpers.gzip.unZipJson(req.body.meta)
      .bind({})
      .then(function (json) {

        let messageId = guidService.generate()
        
        var pingObj = guardianMsgParsingUtils.constructGuardianMsgObj(json, req.params.guardian_id, req.headers["x-auth-token"]);
  
        pingRouter.onMessagePing(pingObj, messageId)
          .then((result) => {

            res.status(200).json(result.obj);
            
            console.log('rest message processed', messageId)
            messageId = null
            result = null
            return true
          })

          .catch(ValidationError, function (err) {
            httpError(req, res, 400, null, err.message)
          })
          .catch(sequelize.EmptyResultError, function (err) {
            console.error('Failed to save ping', err)
            httpError(req, res, 404, null, err.message)
          })
          .catch(function (err) {
            console.error('Failed to save ping', err)
            httpError(req, res, 500, err, 'failed to save ping')
          })

       })


  })


module.exports = router

// function timeStampToDate (timeStamp, legacytimeZoneOffset) {
//   var asDate = null

//   // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
//   if (('' + timeStamp).indexOf(':') > -1) {
//     // LEGACY TIMESTAMP FORMAT
//     asDate = new Date(timeStamp.replace(/ /g, 'T') + legacytimeZoneOffset)
//   } else if (timeStamp != null) {
//     asDate = new Date(parseInt(timeStamp))
//   }
//   return asDate
// }
