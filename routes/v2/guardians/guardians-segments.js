// var models = require('../../../models')
var express = require('express')
var router = express.Router()
var checkInHelpers = require('../../../utils/rfcx-checkin')
var httpError = require('../../../utils/http-errors.js')
var sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')

var guardianMsgParsingUtils = require('../../../utils/rfcx-guardian/guardian-msg-parsing-utils.js').guardianMsgParsingUtils
var pingRouter = require('../../../utils/rfcx-guardian/router-ping.js').pingRouter
const guidService = require('../../../utils/misc/guid.js')

router.route('/segments/twilio')
  .post(function (req, res) {


    res.status(200);

    // // unzip gzipped meta json blob
    // checkInHelpers.gzip.unZipJson(req.body.meta)
    //   .bind({})
    //   .then(function (json) {
    //     let messageId = guidService.generate()

    //     var pingObj = guardianMsgParsingUtils.constructGuardianMsgObj(json, req.params.guardian_id, req.headers['x-auth-token'])

    //     pingRouter.onMessagePing(pingObj, messageId)
    //       .then((result) => {
    //         res.status(200).json(result.obj)

    //         console.log('rest message processed', messageId)
    //         messageId = null
    //         result = null
    //         return true
    //       })

    //       .catch(ValidationError, function (err) {
    //         httpError(req, res, 400, null, err.message)
    //       })
    //       .catch(sequelize.EmptyResultError, function (err) {
    //         console.error('Failed to save ping', err)
    //         httpError(req, res, 404, null, err.message)
    //       })
    //       .catch(function (err) {
    //         console.error('Failed to save ping', err)
    //         httpError(req, res, 500, err, 'failed to save ping')
    //       })
    //   })
  })

module.exports = router
