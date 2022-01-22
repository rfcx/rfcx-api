const models = require('../../_models')
const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../utils/http-error-handler')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const PerceptionsAiService = require('../../_services/legacy/perceptions/perceptions-ai-service')
const ValidationError = require('../../../utils/converter/validation-error')
const ApiConverter = require('../../../utils/api-converter')
const urls = require('../../../utils/misc/urls')
const sequelize = require('sequelize')
const guidService = require('../../../utils/misc/guid.js')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole

/**
 * Takes guid and ai attributes and creates AI
 * @param {*} guid - ai guid to create
 * @param {*} req - request object
 * @param {*} res - response object
 */
function processAiCreation (guid, req, res) {
  const converter = new ApiConverter('ai', req)

  const params = {
    minimal_detected_windows: req.body.minimal_detected_windows,
    minimal_detection_confidence: req.body.minimal_detection_confidence,
    shortname: req.body.shortname,
    event_type: req.body.event_type,
    event_value: req.body.event_value,
    guid: guid,
    is_active: req.body.is_active,
    experimental: req.body.experimental,
    weights: req.files.weights.path,
    model: req.files.model.path,
    attributes: req.files.attributes.path
  }

  PerceptionsAiService.createAi(params)
    .then(ai => {
      const outputData = PerceptionsAiService.formatAi(ai)
      const api = converter.mapSequelizeToApi({
        ai: outputData
      })
      api.links.self = urls.getApiUrl(req) + '/perceptions/ai'
      res.status(200).json(api)
    })
    .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
    // catch-all for any other that is not based on user input
    .catch(e => httpErrorResponse(req, res, 500, e, `Perception Ai couldn't be created: ${e}`))
}

router.route('/ai')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    const converter = new ApiConverter('ai', req)

    return models.AudioAnalysisModel
      .findAll({
        include: [{ all: true }]
      })
      .then(function (data) {
        const outputData = data.map((ai) => {
          return PerceptionsAiService.formatAi(ai)
        })
        const api = converter.mapSequelizeToApi({
          ai: outputData
        })
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai'
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return models | ', err)
        httpErrorResponse(req, res, 500, err, 'failed to return models')
      })
  })

router.route('/ai/:id/precision/events')
  .get(passport.authenticate('token', { session: false }), (req, res) => {
    const converter = new ApiConverter('ai', req)

    PerceptionsAiService
      .findAi(req.params.id)
      .then(PerceptionsAiService.getEventsPrecisionForAI)
      .then((data) => {
        const api = converter.mapSequelizeToApi({
          data: data
        })
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id + '/precision/events'
        res.status(200).json(api)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, `Perception Ai couldn't be found: ${e}`))
  })

router.route('/ai/:id')
  .get(passport.authenticate('token', { session: false }), (req, res) => {
    const converter = new ApiConverter('ai', req)

    PerceptionsAiService
      .findAi(req.params.id)
      .then(PerceptionsAiService.formatAi)
      .then((data) => {
        const api = converter.mapSequelizeToApi({
          ai: data
        })
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id
        res.status(200).json(api)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, `Perception Ai couldn't be found: ${e}`))
  })

router.route('/ai')
  .post(passport.authenticate('token', { session: false }), (req, res) => {
    processAiCreation(guidService.generate(), req, res)
  })

router.route('/ai/:guid')
  .post(passport.authenticate('token', { session: false }), (req, res) => {
    processAiCreation(req.params.guid, req, res)
  })

router.route('/ai/:id')
  .put(passport.authenticate('token', { session: false }), (req, res) => {
    const converter = new ApiConverter('ai', req)

    const params = {
      event_type: req.body.event_type,
      event_value: req.body.event_value,
      minimal_detection_confidence: req.body.minimal_detection_confidence,
      minimal_detected_windows: req.body.minimal_detected_windows,
      experimental: req.body.experimental,
      shortname: req.body.shortname,
      is_active: req.body.is_active
    }

    PerceptionsAiService
      .findAi(req.params.id)
      .then(function (ai) {
        return PerceptionsAiService.updateAi(ai, params)
      })
      .then(PerceptionsAiService.formatAi)
      .then((data) => {
        const api = converter.mapSequelizeToApi({
          ai: data
        })
        api.links.self = urls.getApiUrl(req) + '/perceptions/ai/' + req.params.id
        res.status(200).json(api)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, `Perception Ai couldn't be updated: ${e}`))
  })

module.exports = router
