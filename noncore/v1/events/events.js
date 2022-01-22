const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const guid = require('../../../utils/misc/guid.js')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const Promise = require('bluebird')
const ApiConverter = require('../../../utils/api-converter')
const Converter = require('../../../utils/converter')
const aws = require('../../_utils/external/aws.js').aws()
const moment = require('moment')
const eventsService = require('../../_services/legacy/events/events-service')
const eventValueService = require('../../_services/legacy/events/event-value-service')
const eventTypeService = require('../../_services/legacy/events/event-type-service')
const sequelize = require('sequelize')
const { ValidationError } = require('../../../common/error-handling/errors')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const firebaseService = require('../../_services/firebase/firebase-service')
const guardianGroupService = require('../../_services/guardians/guardian-group-service')
const takeContentTypeFromFileExtMiddleware = require('../../../common/middleware/legacy/take-content-type-from-file-ext')

router.use(takeContentTypeFromFileExtMiddleware)

router.route('/event')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
    const contentType = req.rfcx.content_type
    let isFile = false
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true
    }

    return eventsService.queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsJson(req, res, dbEvents)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json')
              if (isFile) {
                res.attachment('event.json')
              }
              res.status(200).send(json)
            })
        } else if (contentType === 'csv') {
          return views.models.guardianAudioEventsCSV(req, res, dbEvents)
            .then(function (csv) {
              res.contentType('text/csv')
              res.attachment('event.csv')
              res.status(200).send(csv)
            })
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', err)
        res.status(500).json({ msg: err })
      })
  })

router.route('/event/datatable')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventsService.queryDataTable(req)
      .then(function (data) {
        return views.models.guardianAudioEventsJson(req, res, data.events)
          .then((d) => {
            return {
              total: data.total,
              events: d.events
            }
          })
      })
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', err)
        res.status(500).json({ msg: err })
      })
  })

router.route('/stats/guardian')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const contentType = req.rfcx.content_type
    let isFile = false
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true
    }

    return eventsService.queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsByGuardianJson(req, res, dbEvents)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json')
              if (isFile) {
                res.attachment('event.json')
              }
              res.status(200).send(json)
            })
        } else if (contentType === 'csv') {
          return views.models.guardianAudioEventsByGuardianCSV(req, res, dbEvents)
            .then(function (csv) {
              res.contentType('text/csv')
              res.attachment('event.csv')
              res.status(200).send(csv)
            })
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', arguments)
        res.status(500).json({ msg: err })
      })
  })

router.route('/stats/dates')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), eventsService.processStatsByDates)

router.route('/stats/weekly')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    if (!req.query) {
      req.query = {}
    }

    const dateStr = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss')
    req.query.starting_after = dateStr

    return eventsService.processStatsByDates(req, res)
  })

router.route('/stats/monthly')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    if (!req.query) {
      req.query = {}
    }

    const dateStr = moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss')
    req.query.starting_after = dateStr

    return eventsService.processStatsByDates(req, res)
  })

router.route('/stats/half-year')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    if (!req.query) {
      req.query = {}
    }

    const dateStr = moment().subtract(6, 'month').format('YYYY-MM-DD HH:mm:ss')
    req.query.starting_after = dateStr

    return eventsService.processStatsByDates(req, res)
  })

router.route('/stats/year')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    if (!req.query) {
      req.query = {}
    }

    const dateStr = moment().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss')
    req.query.starting_after = dateStr

    return eventsService.processStatsByDates(req, res)
  })

router.route('/tuning')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const converter = new ApiConverter('event', req)

    const opts = {
      type: req.query.type,
      modelGuid: req.query.modelGuid,
      minWindows: parseInt(req.query.minWindows),
      minProbability: parseFloat(req.query.minProbability),
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    }

    const sql = 'SELECT g.shortname, a.guid as audio_guid, a.measured_at, count(t.audio_id) as count, avg(t.confidence) as prob, s.timezone_offset, s.timezone FROM GuardianAudioTags t ' +
      'INNER JOIN AudioAnalysisModels m on m.guid=:modelGuid ' +
      'INNER JOIN GuardianAudio a on audio_id=a.id ' +
      'INNER JOIN GuardianSites s on site_id=s.id ' +
      'INNER JOIN Guardians g on g.id=a.guardian_id ' +
      'WHERE tagged_by_model=m.id and tagged_by_model is not null and confidence>=:minProbability and value=:type and a.measured_at>=:dateFrom and a.measured_at<:dateTo ' +
      'GROUP BY t.audio_id ' +
      'HAVING COUNT(t.audio_id)>=:minWindows ' +
      'ORDER BY a.measured_at DESC;'

    models.sequelize.query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT })
      .then(function (data) {
        const apiEvent = converter.cloneSequelizeToApi(data)
        res.status(200).json(apiEvent)
      })
      .catch(function (err) {
        res.status(500).json({ msg: err })
      })
  })

router.route('/values')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('high_level_key').optional().toString()

    params.validate()
      .then(() => {
        return eventValueService.getGuardianAudioEventValues(transformedParams)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Could not return Guardian Audio Event Values.'); console.log(e) })
  })

router.route('/values/hlk/:value')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventValueService.searchForHighLevelKeysImageAndDescription(req.params.value)
      .then((data) => { res.status(200).json(data) })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Could not return image and description for Guardian Audio Event Value.'); console.log(e) })
  })

router.route('/values/:value')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return eventValueService.getGuardianAudioEventValue(req.params.value, true)
      .then(eventValueService.formatGuardianAudioEventValue)
      .then((data) => { res.status(200).json(data) })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Could not return data for Guardian Audio Event Value.'); console.log(e) })
  })

router.route('/high-level-keys')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('search').toString().trim().nonEmpty().minLength(3)

    params.validate()
      .then(() => {
        return eventValueService.searchForHighLevelKeys(transformedParams.search)
      })
      .then((data) => { res.status(200).json(data) })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Could not search for high level keys of audio labels.'); console.log(e) })
  })

router.route('/types')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    eventTypeService
      .getGuardianAudioEventTypes()
      .then((data) => { res.status(200).json(data) })
      .catch(e => httpErrorResponse(req, res, 500, e, 'Could not return Guardian Audio Event Types.'))
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    eventsService
      .getEventByGuid(req.params.guid)
      .then((event) => {
        return views.models.guardianAudioEventsJson(req, res, event)
      })
      .then((data) => {
        res.status(200).json(data.events[0])
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, "GuardianAudioEvent couldn't be found."))
  })

router.route('/')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiSystem']), function (req, res) {
    const converter = new ApiConverter('event', req)

    const body = req.body

    const attrs = {
      confidence: body.confidence,
      windows: body.windows,
      audio_id: body.audio_id,
      type: body.type,
      value: body.value,
      begins_at: body.begins_at,
      ends_at: body.ends_at,
      model: body.model,
      reason_for_creation: body.reason_for_creation || 'pgm' // set `pgm` by default
    }

    // default windows to 0 if none are provided
    // Todo: delete windows altogether
    if (!attrs.windows) {
      attrs.windows = 0
    }

    function checkAttrValidity () {
      let missingAttrs = ''

      for (const key in attrs) {
        if (attrs.hasOwnProperty(key)) { // eslint-disable-line no-prototype-builtins
          if (key === 'begins_at' || key === 'ends_at') {
            continue
          }
          if (attrs[key] === undefined || attrs[key] === null) {
            missingAttrs += (' ' + key)
          }
        }
      }

      return {
        status: !missingAttrs.length,
        missingAttrsStr: missingAttrs.length ? 'Missing required attributes:' + missingAttrs : null
      }
    }

    const attrsValidity = checkAttrValidity()
    if (!attrsValidity.status) {
      return httpErrorResponse(req, res, 400, null, attrsValidity.missingAttrsStr)
    }
    if (body.guid && !guid.isValid(body.guid)) {
      return httpErrorResponse(req, res, 400, null, 'Guardian Audio Event guid has incorrect format')
    }

    const promises = []

    promises.push(models.GuardianAudio.findOne({
      where: { guid: attrs.audio_id },
      include: [{ all: true }]
    }))
    promises.push(models.AudioAnalysisModel.findOne({ where: { [models.Sequelize.Op.or]: { shortname: attrs.model, guid: attrs.model } } }))
    promises.push(models.GuardianAudioEventType.findOrCreate({
      where: { [models.Sequelize.Op.or]: { value: attrs.type, id: attrs.type } },
      defaults: { value: attrs.type }
    }))
    promises.push(models.GuardianAudioEventValue.findOrCreate({
      where: { [models.Sequelize.Op.or]: { value: attrs.value, id: attrs.value } },
      defaults: { value: attrs.value }
    }))
    promises.push(models.GuardianAudioEventReasonForCreation.findOne({
      where: { name: attrs.reason_for_creation }
    }))

    Promise.all(promises)
      .bind({})
      .then(function (data) {
        if (!data[0]) {
          httpErrorResponse(req, res, 404, null, 'Audio with given guid not found')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        if (!data[0].Guardian) {
          httpErrorResponse(req, res, 500, null, 'Audio is not associated with any Guardians')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        if (!data[1]) {
          httpErrorResponse(req, res, 404, null, 'Model with given shortname/guid not found')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }
        if (!data[4]) {
          httpErrorResponse(req, res, 404, null, 'Reason for Creation with given name not found')
          return Promise.reject() // eslint-disable-line prefer-promise-reject-errors
        }

        if (attrs.begins_at === undefined || attrs.begins_at === null) {
          attrs.begins_at = data[0].measured_at
        }
        if (attrs.ends_at === undefined || attrs.ends_at === null) {
          attrs.ends_at = new Date(data[0].measured_at.getTime() + 1000 * 90)
        }

        this.dbAudio = data[0]
        this.dbGuardian = data[0].Guardian
        this.dbSite = data[0].Site
        this.dbModel = data[1]

        // replace names with ids
        attrs.audio_id = data[0].id
        attrs.audio_guid = data[0].guid
        this.audio_guid = data[0].guid
        attrs.model = data[1].id
        this.model = data[1].shortname
        attrs.type = data[2][0].id
        this.type = data[2][0].value
        attrs.value = data[3][0].id
        this.value = data[3][0].value
        attrs.reason_for_creation = data[4].id

        attrs.guardian = data[0].Guardian.id
        this.guardian = data[0].Guardian.shortname
        this.guardian_id = data[0].Guardian.id
        attrs.shadow_latitude = data[0].Guardian.latitude
        attrs.shadow_longitude = data[0].Guardian.longitude

        attrs.reviewed_by = null
        attrs.reviewer_confirmed = null

        let where = {}
        if (body.guid) {
          where = {
            guid: body.guid
          }
        } else {
          where = {
            [models.Sequelize.Op.and]: {
              audio_id: attrs.audio_id,
              type: attrs.type,
              value: attrs.value,
              model: attrs.model,
              guardian: attrs.guardian,
              reason_for_creation: attrs.reason_for_creation
            }
          }
        }

        return models.GuardianAudioEvent
          .findOrCreate({
            where,
            defaults: attrs
          })
      })
      .spread(function (dbGuardianAudioEvent, created) {
        if (created) {
          return Promise.resolve(dbGuardianAudioEvent)
        } else {
          return models.GuardianAudioEvent
            .update(attrs, { where: { guid: dbGuardianAudioEvent.guid } })
            .spread(function () {
              return models.GuardianAudioEvent.findOne({ where: { guid: dbGuardianAudioEvent.guid }, include: [{ all: true }] })
            })
        }
      })
      .then(function (data) {
        const apiEvent = converter.mapSequelizeToApi(data)
        res.status(200).json(apiEvent)
        return data
      })
      .then(function (event) {
        // send notiication only if audio was created in last 2 hours
        if (this.type === 'alert_sap_windowcount' && moment.tz('UTC').diff(moment.tz(this.dbAudio.measured_at, 'UTC'), 'hours') < 2) {
          guardianGroupService.getAllGroupsForGuardianId(this.dbGuardian.id)
            .then((dbGuardianGroups) => {
              dbGuardianGroups.forEach((dbGuardianGroup) => {
                // send notiication only if guardian group allows this value of notification
                if (dbGuardianGroup.GuardianAudioEventValues && dbGuardianGroup.GuardianAudioEventValues.find((dbEventValue) => {
                  return dbEventValue.value === this.value
                })) {
                  // send Firebase push notification to required topic
                  try {
                    const opts = {
                      app: 'rangerApp',
                      topic: dbGuardianGroup.shortname,
                      data: {
                        issuer: 'perception_cognition',
                        type: this.type,
                        value: this.value,
                        event_guid: event.guid,
                        audio_guid: this.audio_guid,
                        latitude: `${this.dbGuardian.latitude}`,
                        longitude: `${this.dbGuardian.longitude}`,
                        guardian_guid: this.dbGuardian.guid,
                        guardian_shortname: this.dbGuardian.shortname,
                        site_guid: this.dbSite.guid,
                        ai_guid: this.dbModel.guid
                      },
                      title: 'Rainforest Connection',
                      body: `A ${this.value} detected from ${this.guardian}`
                    }
                    firebaseService.sendToTopic(opts)
                      .catch((err) => {
                        console.error(`Error sending Firebase message to ${this.dbSite.guid} topic`, err)
                      })
                  } catch (e) {
                    console.error(`Error sending Firebase message to ${this.dbSite.guid} topic`, e)
                  }
                }
              })
            })
        }
        return true
      })
      .then(function () {
        const msg = {
          type: this.type,
          detected: this.value,
          guardian: this.guardian,
          model: this.model,
          audio_guid: this.audio_guid,
          // Todo: generate a proper url string, need some sleep but will replace it tomorrow
          listen: 'https://console.rfcx.org/#/classification?guid=' + this.audio_guid + '&typevalue=' + this.value + '&access=read'
        }

        // currently we only send out alerts.
        // Todo: this needs to be replaced by a general alert handler that allows for more configuration.
        const excludedGuardians = []
        if (!excludedGuardians.includes(this.guardian_id)) {
          const topic = 'rfcx-detection-alerts-' + this.dbSite.guid
          aws.createTopic(topic)
            .then((data) => {
              return aws.publish(topic, msg)
            })
            .catch((err) => {
              console.error('Event creation request: error creating SNS topic', err)
            })
        }
      })
      .catch(function (err) {
        if (err) {
          console.log(err)
          if (err.name && err.name === 'SequelizeValidationError') {
            httpErrorResponse(req, res, 400, null, 'Input data has incorrect format')
          } else {
            httpErrorResponse(req, res, 500, 'database')
          }
        }
      })
  })

router.route('/:event_id/review')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'rfcxUser']), function (req, res) {
    models.GuardianEvent
      .findAll({
        where: { guid: req.params.event_id },
        include: [{ all: true }],
        limit: 1
      }).then(function (dbEvent) {
        if (dbEvent.length < 1) {
          httpErrorResponse(req, res, 404, 'database')
        } else {
          const reviewerInput = {
            classification: (req.body.classification != null) ? req.body.classification.toLowerCase() : null,
            begins_at: (req.body.begins_at != null) ? new Date(req.body.begins_at) : null,
            duration: (req.body.duration != null) ? parseInt(req.body.duration) : null,
            invalidated: (req.body.invalidated != null) ? req.body.invalidated : null
          }

          if (reviewerInput.classification != null) {
            dbEvent[0].classification_reviewer = reviewerInput.classification
          }
          if (reviewerInput.begins_at != null) {
            dbEvent[0].begins_at_reviewer = reviewerInput.begins_at
          }
          if (reviewerInput.duration != null) {
            dbEvent[0].duration_reviewer = reviewerInput.duration
          }
          if (reviewerInput.invalidated != null) {
            if (reviewerInput.invalidated === 'true') {
              dbEvent[0].invalidated_reviewer = true
            } else if (reviewerInput.invalidated === 'false') {
              dbEvent[0].invalidated_reviewer = false
            }
          }

          dbEvent[0].reviewed_at = new Date()
          dbEvent[0].reviewer_id = req.rfcx.auth_token_info.owner_id

          dbEvent[0].save()

          views.models.guardianEvents(req, res, dbEvent)
            .then(function (json) {
              res.status(200).json(json)
            })
        }
      }).catch(function (err) {
        console.log(err)
        if (err) {
          httpErrorResponse(req, res, 500, 'database')
        }
      })
  })

router.route('/:guid/comment')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'rfcxUser']), function (req, res) {
    eventsService
      .updateEventComment(req.params.guid, req.body.comment)
      .then((event) => {
        return views.models.guardianAudioEventsJson(req, res, event)
      })
      .then((data) => {
        res.status(200).json(data.events[0])
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { console.log(e); httpErrorResponse(req, res, 500, e, 'Error in process of saving comment for event') })
  })

router.route('/:guid/confirm')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'rfcxUser']), function (req, res) {
    eventsService.updateEventReview(req.params.guid, true, req.rfcx.auth_token_info.owner_id)
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, 'Could not update Event review.'))
  })

router.route('/:guid/reject')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'rfcxUser']), function (req, res) {
    eventsService.updateEventReview(req.params.guid, false, req.rfcx.auth_token_info.owner_id)
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, 'Could not update Event review.'))
  })

module.exports = router
