const express = require('express')
var router = express.Router()
const path = require('path')
const passport = require('passport')
const httpError = require('../../../utils/http-errors.js')
const archiveUtil = require('../../../utils/misc/archive')
const dirUtil = require('../../../utils/misc/dir')
const fileUtil = require('../../../utils/misc/file')
const guidUtil = require('../../../utils/misc/guid')
const eventsServiceNeo4j = require('../../../services/events/events-service-neo4j')
const usersService = require('../../../services/users/users-service')
const usersServiceNeo4j = require('../../../services/users/users-service-neo4j')
const ValidationError = require('../../../utils/converter/validation-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const guardiansService = require('../../../services/guardians/guardians-service')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')
const sequelize = require('sequelize')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    return eventsServiceNeo4j.queryData(req)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while searching events.'); console.log(e) })
  })

router.route('/reviews')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventsServiceNeo4j.queryReviews(req)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while searching reviews.'); console.log(e) })
  })

router.route('/reviews/ai-models')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventsServiceNeo4j.getAiModelsForReviews(req)
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Could not find AI models.'); console.log(e) })
  })

router.route('/reviews/download')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    const tempGuid = guidUtil.generate()
    const reviewsPath = path.join(process.env.CACHE_DIRECTORY, 'reviews')

    return dirUtil.ensureDirExists(reviewsPath)
      .then(() => {
        return eventsServiceNeo4j.queryReviews(req)
      })
      .then((data) => {
        if (!data.length) {
          throw new EmptyResultError('No reviews found for requested parameters.')
        }
        return eventsServiceNeo4j.formatReviewsForFiles(data)
      })
      .then((files) => {
        return archiveUtil.archiveStrings(reviewsPath, `reviews-${tempGuid}.zip`, files)
      })
      .then((zipPath) => {
        return fileUtil.serveFile(res, zipPath, 'reviews.zip', 'application/zip, application/octet-stream', !!req.query.inline)
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => { console.log(e); httpError(req, res, 500, e, 'Error while searching reviews.') })
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventsServiceNeo4j.getEventByGuid(req.params.guid)
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, 'Event with given guid not found.'))
  })

router.route('/:guid/windows')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    return eventsServiceNeo4j.queryWindowsForEvent(req.params.guid)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while searching for event tags.'); console.log(e) })
  })

router.route('/:guid/trigger')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['systemUser']), function (req, res) {
    let eventData, guardian

    return eventsServiceNeo4j.getEventInfoByGuid(req.params.guid)
      .bind({})
      .then((data) => {
        eventData = data
        return guardiansService.getGuardianByGuid(data.event.guardianGuid)
      })
      .then((dbGuardian) => {
        guardian = dbGuardian
        const notificationData = {
          issuer: 'prediction_service',
          event_guid: eventData.event.guid,
          audio_guid: eventData.event.audioGuid,
          measured_at: eventData.event.audioMeasuredAt,
          value: eventData.label.value,
          guardian_id: guardian.id,
          guardian_guid: guardian.guid,
          guardian_shortname: guardian.shortname,
          latitude: guardian.latitude,
          longitude: guardian.longitude,
          site_guid: eventData.event.siteGuid,
          site_timezone: eventData.event.siteTimezone,
          ai_guid: eventData.ai.guid,
          ai_name: eventData.ai.name,
          ignore_time: req.body.ignore_time !== undefined ? (req.body.ignore_time === true) : undefined
        }
        return eventsServiceNeo4j.sendNotificationsForEvent(notificationData)
      })
      .then(() => {
        eventData = null
        guardian = null
        res.status(200).send({ success: true })
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while triggering event notification.'); console.log(e) })
  })

router.route('/:guid/review')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('confirmed').toBoolean()
    params.convert('windows').toArray()
    params.convert('unreliable').optional().toBoolean().default(false)

    const user = usersService.getUserDataFromReq(req)
    const timestamp = (new Date()).valueOf()

    return params.validate()
      .then(() => {
        return usersServiceNeo4j.ensureUserExistsNeo4j(user)
      })
      .then(() => {
        if (!user.avatar || !user.avatar === '') {
          return Promise.resolve()
        } else {
          return usersServiceNeo4j.updateUserPicture(user)
        }
      })
      .then(() => {
        return eventsServiceNeo4j.clearPreviousReviewOfUser(req.params.guid, user)
      })
      .then(() => {
        return eventsServiceNeo4j.clearPreviousAudioWindowsReviewOfUser(req.params.guid, user)
      })
      .then(() => {
        return eventsServiceNeo4j.clearLatestReview(req.params.guid)
      })
      .then(() => {
        return eventsServiceNeo4j.clearLatestAudioWindowsReview(req.params.guid)
      })
      .then(() => {
        return eventsServiceNeo4j.reviewEvent(req.params.guid, transformedParams.confirmed, user, timestamp, transformedParams.unreliable)
      })
      .then(() => {
        return eventsServiceNeo4j.reviewAudioWindows(transformedParams.windows, user, timestamp, transformedParams.unreliable)
      })
      .then(() => {
        res.status(200).send({ success: true })
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while saving review data.'); console.log(e) })
  })

module.exports = router
