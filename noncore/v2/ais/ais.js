const express = require('express')
const router = express.Router()
const passport = require('passport')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const ValidationError = require('../../../utils/converter/validation-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Converter = require('../../../utils/converter/converter')
const aiService = require('../../_services/legacy/ai/ai-service')
const audioService = require('../../_services/audio/audio-service')
const aws = require('../../_utils/external/aws.js').aws()
const sequelize = require('sequelize')
const dirUtil = require('../../../utils/misc/dir')
const fileUtil = require('../../../utils/misc/file')
const path = require('path')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin', 'systemUser']), function (req, res) {
    return aiService.getPublicAis()
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting public AIs.'); console.log(e) })
  })

router.route('/collections')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicCollections(req.query)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting public AICs.'); console.log(e) })
  })

router.route('/collections/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicCollectionAndAisByGuid(req.params.guid)
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting collection and ais by guid.'); console.log(e) })
  })

router.route('/create')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('name').optional().toString()
    params.convert('aiCollectionGuid').optional().toString()
    params.convert('aiGuid').toString()
    params.convert('labels').optional().toArray()
    params.convert('stepSeconds').toFloat()
    params.convert('minWindowsCount').toInt()
    params.convert('maxWindowsCount').toInt()
    params.convert('minConfidence').toFloat()
    params.convert('maxConfidence').toFloat()
    params.convert('minBoxPercent').toInt()
    params.convert('public').toBoolean()
    params.convert('guardiansWhitelist').toArray()
    params.convert('isActive').optional().toBoolean().default(false)

    params.validate()
      .then(async () => {
        const ai = await aiService.createAi(transformedParams)
        await aiService.createSNSSQSStuff(transformedParams.aiGuid)
        return res.status(200).json(ai)
      })
      .catch(ValidationError, e => { httpErrorResponse(req, res, 400, null, e.message) })
      .catch(EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while creating the AI.'); console.log(e) })
  })

router.route('/:guid/sns-sqs')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicAiByGuid(req.params.guid)
      .then(() => {
        return aiService.getSNSSQSInfo(req.params.guid)
      })
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while getting SNS topic and SQS queue for AI with guid "${req.params.guid}".`); console.log(e) })
  })

router.route('/:guid/sns-sqs')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    return aiService.getPublicAiByGuid(req.params.guid)
      .then(() => {
        return aiService.createSNSSQSStuff(req.params.guid)
      })
      .then((json) => {
        res.status(200).send({ success: true })
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while creating SNS topic and SQS queue for AI with guid "${req.params.guid}".`); console.log(e) })
  })

router.route('/:guid/upload-file')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
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
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return aiService.getPublicAiByGuid(req.params.guid)
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while getting AI with guid "${req.params.guid}".`); console.log(e) })
  })

// AI model update

router.route('/:guid')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('stepSeconds').toFloat()
    params.convert('minWindowsCount').toInt()
    params.convert('maxWindowsCount').toInt()
    params.convert('minConfidence').toFloat()
    params.convert('maxConfidence').toFloat()
    params.convert('minBoxPercent').toInt()
    params.convert('guardians').toArray()
    params.convert('isActive').optional().toBoolean()

    params.validate()
      .then(() => {
        return aiService.updateAiByGuid(req.params.guid, transformedParams)
      })
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while updating the AI.'); console.log(e) })
  })

router.route('/:guid/batch-analysis')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['aiAdmin']), function (req, res) {
    let ai

    return aiService.getPublicAiByGuid(req.params.guid)
      .then((data) => {
        ai = data
        return audioService.queryData(req)
      })
      .then((data) => {
        const audios = data.audios.filter((audio) => {
          return (ai.guardiansWhitelist || []).includes(audio.guardian_guid) &&
            !!audio.file_extension && !!audio.sample_rate && !!audio.capture_sample_count
        })
        const topicName = aiService.combineTopicQueueNameForGuid(ai.guid)
        const proms = []
        audios.forEach((audio) => {
          const message = audioService.formatAudioForSNSMessage(audio)
          const prom = aws.publish(topicName, message)
          proms.push(prom)
        })
        return Promise.resolve(proms)
          .then(() => {
            return {
              total: audios.length,
              audioGuids: audios.map((audio) => {
                return audio.guid
              })
            }
          })
      })
      .then((data) => {
        res.status(200).send(data)
        ai = null
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while triggering batch analysis.'); console.log(e) })
  })

router.route('/:guid/download')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const extension = '.tar.gz'
    const fileName = `${req.params.guid}${extension}`
    const aisPath = path.join(process.env.CACHE_DIRECTORY, 'ais')
    const opts = {
      filePath: aisPath,
      fileName: fileName,
      bucket: process.env.ASSET_BUCKET_AI
    }
    return dirUtil.ensureDirExists(opts.filePath)
      .then(() => {
        return aiService.downloadAIFile(opts)
      })
      .then(() => {
        const sourceFilePath = `${opts.filePath}/${opts.fileName}`
        return fileUtil.serveFile(res, sourceFilePath, opts.fileName, 'application/x-gzip, application/octet-stream', false)
      })
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while downloading for model.'); console.log(e) })
  })

module.exports = router
