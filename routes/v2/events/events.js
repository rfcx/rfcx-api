const express = require('express')
const router = express.Router()
const path = require('path')
const passport = require('passport')
const httpError = require('../../../utils/http-errors.js')
const archiveUtil = require('../../../utils/misc/archive')
const dirUtil = require('../../../utils/misc/dir')
const fileUtil = require('../../../utils/misc/file')
const guidUtil = require('../../../utils/misc/guid')
const eventsServiceNeo4j = require('../../../services/legacy/events/events-service-neo4j')
const eventsServiceTimescale = require('../../../services/legacy/events/events-service-timescaledb')
const ValidationError = require('../../../utils/converter/validation-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const guardiansService = require('../../../services/guardians/guardians-service')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')
const sequelize = require('sequelize')
const earthRangerEnabled = `${process.env.EARTHRANGER_ENABLED}` === 'true'
const earthRangerService = earthRangerEnabled ? require('../../../services/earthranger') : {}
const moment = require('moment')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')

function query (req, res) {
  return eventsServiceNeo4j.queryData(req)
    .then(function (json) {
      res.status(200).send(json)
    })
    .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    .catch(e => { httpError(req, res, 500, e, 'Error while searching events.'); console.log(e) })
}

/**
 * @swagger
 *
 * /v2/events:
 *   get:
 *     summary: Get list of events
 *     tags:
 *       - legacy
 *     parameters:
 *       - name: guardian_groups
 *         description: List of legacy guardian groups ids
 *         in: query
 *         type: array|string
 *       - name: values
 *         description: List of clasification values
 *         in: query
 *         type: array|string
 *       - name: limit
 *         description: Maximum number of results to return
 *         in: query
 *         type: int
 *         default: 100
 *       - name: offset
 *         description: Number of results to skip
 *         in: query
 *         type: int
 *         default: 0
 *       - name: dir
 *         description: Results ordering
 *         in: query
 *         type: string
 *         default: DESC
 *       - name: dir
 *         description: Results ordering by datetime
 *         in: query
 *         type: string
 *         default: DESC
 *     responses:
 *       200:
 *         description: List of legacy event objects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EventLegacy'
 *       400:
 *         description: Invalid query parameters
 */
router.route('/').get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), (req, res) => {
  const user = req.rfcx.auth_token_info
  const converter = new Converter(req.query, {}, true)
  converter.convert('values').optional().toArray()
  converter.convert('guardian_groups').optional().toArray()
  converter.convert('dir').default('DESC').toString()
  converter.convert('limit').toInt().default(100).maximum(1000)
  converter.convert('offset').toInt().default(0)

  return converter.validate()
    .then(params => {
      return eventsServiceTimescale.query(params, user)
    })
    .then(function (json) {
      res.status(200).send(json)
    })
    .catch(httpErrorHandler(req, res, 'Failed getting events'))
})

router.route('/search')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res, next) {
    req.query = req.body
    next()
  }, query)

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
        res.status(200).send({ success: true })
      })
      .then(async () => {
        if (earthRangerEnabled && eventData.event.siteGuid === 'osa') {
          try {
            await earthRangerService.createEvent({
              event_type: 'acoustic_detection',
              time: moment.utc(eventData.event.audioMeasuredAt).toISOString(),
              location: {
                latitude: guardian.latitude,
                longitude: guardian.longitude
              },
              event_details: {
                acoustic_detection_classification: eventData.label.label,
                acoustic_detection_device: guardian.shortname,
                acoustic_detection_audio_url: `${process.env.ASSET_URLBASE}/audio/${eventData.event.audioGuid}.mp3`
              },
              priority: 100
            })
            console.log(`An acoustic_detection with ${eventData.label.label} was created for ${guardian.shortname} in EarthRanger service.`)
          } catch (e) {
            console.error('Cannot send event to EarthRanger service', e.message)
          }
        }
      })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, 'Error while triggering event notification.'); console.log(e) })
      .finally(() => {
        eventData = null
        guardian = null
      })
  })

/**
 * @swagger
 *
 * /v2/events/{guid}/review:
 *   post:
 *     summary: Does nothing [deprecated] - was reviewing events in Neo4j database previosly
 *     tags:
 *       - legacy
 *     responses:
 *       200:
 *         description: Success result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 */
router.route('/:guid/review')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), function (req, res) {
    res.status(200).send({ success: true })
  })

module.exports = router
