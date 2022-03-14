const express = require('express')
const router = express.Router()
const passport = require('passport')
const { httpErrorResponse } = require('../../../utils/http-error-handler')
const { ValidationError } = require('../../../common/error-handling/errors')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter')
const aiService = require('../../../services/legacy/ai/ai-service')
const sequelize = require('sequelize')

/**
 * Syncronizes MySQL GuardianAudioEventValues and GuardianAudioEventValueHighLevelKeys with :label and :highLevelKey:
 */
router.route('/sync')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicAis()
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting public AIs.'); console.error(e) })
  })

router.route('/collections')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicCollections()
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting public AICs.'); console.error(e) })
  })

router.route('/collections/:guid')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicCollectionAndAisByGuid(req.params.guid)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting collection and ais by guid.'); console.error(e) })
  })

router.route('/create')
  .post(passport.authenticate(['jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('name').optional().toString()
    params.convert('aiCollectionGuid').optional().toString()
    params.convert('aiGuid').toString()
    params.convert('labels').optional().toArray()
    // params.convert('lexicalEntryId').optional().toString();
    params.convert('stepSeconds').toNonNegativeInt().toFloat()
    params.convert('minWindowsCount').toInt()
    params.convert('maxWindowsCount').toInt()
    params.convert('minConfidence').toFloat()
    params.convert('maxConfidence').toFloat()
    params.convert('minBoxPercent').toInt()
    params.convert('public').toBoolean()
    params.convert('guardiansWhitelist').toArray()

    params.validate()
      .then(() => {
        return aiService.createAi(transformedParams)
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(ValidationError, e => { httpErrorResponse(req, res, 400, null, e.message) })
      .catch(EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while creating the AI.'); console.error(e) })
  })

router.route('/:guid/upload-file')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    const file = req.files.file
    if (!file) {
      return httpErrorResponse(req, res, 400, null, 'No file provided.')
    }
    const extension = '.tar.gz'
    if (!file.originalname.endsWith(extension)) {
      return httpErrorResponse(req, res, 400, null, `Wrong file type. Allowed types are: ${extension}`)
    }

    const opts = {
      filePath: req.files.file.path,
      fileName: `${req.params.guid}${extension}`,
      bucket: process.env.ASSET_BUCKET_AI
    }
    return aiService.uploadAIFile(opts)
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'File couldn\'t be uploaded.'))
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return aiService.getPublicAiByGuid(req.params.guid)
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while getting AI with guid "${req.params.guid}".`); console.error(e) })
  })

// AI model update

router.route('/:guid')
  .post(passport.authenticate(['token', 'jwt'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('stepSeconds').toNonNegativeInt().toFloat()
    params.convert('minWindowsCount').toInt()
    params.convert('maxWindowsCount').toInt()
    params.convert('minConfidence').toFloat()
    params.convert('maxConfidence').toFloat()
    params.convert('minBoxPercent').toInt()
    params.convert('guardians').toArray()

    params.validate()
      .then(() => {
        return aiService.updateAiByGuid(req.params.guid, transformedParams)
      })
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while updating the AI.'); console.error(e) })
  })

module.exports = router
