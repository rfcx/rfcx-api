var models = require('../../../models')
var express = require('express')
var router = express.Router()
var sequelize = require('sequelize')
var passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
const path = require('path')
var hasRole = require('../../../middleware/authorization/authorization').hasRole
const reportsService = require('../../../services/reports/reports-service')
const attachmentService = require('../../../services/attachment/attachment-service')
const usersService = require('../../../services/users/users-service-legacy')
const sitesService = require('../../../services/sites/sites-service')
const guid = require('../../../utils/misc/guid')
const Converter = require('../../../utils/converter/converter')
const ValidationError = require('../../../utils/converter/validation-error')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const httpError = require('../../../utils/http-errors.js')

router.route('/')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('lat').toFloat()
    params.convert('long').toFloat()
    params.convert('reported_at').toString()
    params.convert('value').toString()
    params.convert('site').toString()
    params.convert('distance').optional().toNonNegativeInt()
    params.convert('age_estimate').toNonNegativeInt()
    params.convert('notes').optional().toString()

    return params.validate()
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((user) => {
        transformedParams.reporter = user.id
        transformedParams.guid = guid.generate()
        return sitesService.getSiteByGuid(transformedParams.site)
      })
      .then((site) => {
        transformedParams.site = site.id
        return models.GuardianAudioEventValue.findOrCreate({
          where: { value: transformedParams.value },
          defaults: { value: transformedParams.value }
        })
      })
      .then((dbGuardianAudioEventValue) => {
        transformedParams.value = dbGuardianAudioEventValue[0].id
        if (req.files && req.files.audio) {
          const fileName = `${transformedParams.guid}${path.extname(req.files.audio.originalname)}`
          return attachmentService.uploadAttachment({
            filePath: req.files.audio.path,
            fileName: fileName,
            type: 'audio',
            bucket: process.env.ASSET_BUCKET_REPORT,
            time: transformedParams.reported_at
          })
        }
        return null
      })
      .then((filename) => {
        if (filename) {
          transformedParams.audio = `${process.env.ASSET_URLBASE}/report/audio/${filename}`
        }
        return reportsService.createReport(transformedParams)
      })
      .then((dbReport) => {
        return reportsService.formatReport(dbReport)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Report couldn\'t be created.'))
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return reportsService.getReportByGuid(req.params.guid)
      .then((dbReport) => {
        return reportsService.formatReport(dbReport)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Could not find report.'))
  })

router.route('/:guid')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('lat').optional().toFloat()
    params.convert('long').optional().toFloat()
    params.convert('distance').optional().toNonNegativeInt()
    params.convert('age_estimate').optional().toNonNegativeInt()
    params.convert('notes').optional().toString()

    let dbReport

    return params.validate()
      .then(() => {
        return reportsService.getReportByGuid(req.params.guid)
      })
      .then((report) => {
        dbReport = report
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((dbUser) => {
        if (dbReport.reporter !== dbUser.id) {
          throw new ForbiddenError('You can\'t change report of another user.')
        }
        return reportsService.updateReport(dbReport, transformedParams)
      })
      .then(() => {
        return reportsService.formatReport(dbReport)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => httpError(req, res, 403, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Could not find report.'))
  })

router.route('/:guid/attachments')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('type').toString()
    params.convert('time').toString()

    let dbReport, dbAttachments

    return params.validate()
      .then(() => {
        return reportsService.getReportByGuid(req.params.guid)
      })
      .then((data) => {
        dbReport = data
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((dbUser) => {
        transformedParams.user_id = dbUser.id
        return attachmentService.findOrCreateAttachmentType(transformedParams.type)
      })
      .then((dbAttachmentType) => {
        transformedParams.type_id = dbAttachmentType.id
        const proms = []
        if (req.files && req.files.attachments) {
          req.files.attachments = Array.isArray(req.files.attachments) ? req.files.attachments : [req.files.attachments]
          req.files.attachments.forEach((file) => {
            file.rfcxGuid = guid.generate()
            const prom = attachmentService.uploadAttachment({
              filePath: file.path,
              fileName: `${file.rfcxGuid}${path.extname(file.originalname)}`,
              type: dbAttachmentType.type,
              bucket: process.env.ASSET_BUCKET_ATTACHMENT,
              time: transformedParams.time
            })
            proms.push(prom)
          })
        }
        return Promise.all(proms)
      })
      .then(() => {
        const proms = []
        if (req.files && req.files.attachments) {
          req.files.attachments.forEach((file) => {
            const prom = attachmentService.createAttachment({
              guid: file.rfcxGuid,
              reported_at: transformedParams.time,
              url: `${process.env.ASSET_URLBASE}/attachments/${file.rfcxGuid}${path.extname(file.originalname)}`,
              type_id: transformedParams.type_id,
              user_id: transformedParams.user_id
            })
            proms.push(prom)
          })
        }
        return Promise.all(proms)
      })
      .then((data) => {
        dbAttachments = data
        return reportsService.attachAttachmentsToReport(dbAttachments, dbReport)
      })
      .then(() => {
        return attachmentService.formatAttachments(dbAttachments)
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log(e); httpError(req, res, 500, e, e.message || 'Could not save report attachments.') })
  })

router.route('/:guid')
  .delete(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['reportAdmin']), function (req, res) {
    let dbReport
    return reportsService.getReportByGuid(req.params.guid)
      .then((data) => {
        dbReport = data
      })
      .then(() => {
        const proms = []
        if (dbReport.Attachments) {
          const attachments = dbReport.Attachments
          const s3Bucket = process.env.ASSET_BUCKET_ATTACHMENT
          attachments.forEach((file) => {
            const extension = path.extname(file.url)
            const prom = attachmentService.removeAttachmentFromS3({
              fileName: `${file.guid}${extension}`,
              bucket: s3Bucket,
              type: file.Type.type,
              time: file.reported_at
            })
            proms.push(prom)
          })
        }
        return Promise.all(proms)
      })
      .then(() => {
        const proms = []
        if (dbReport.Attachments) {
          const attachments = dbReport.Attachments
          attachments.forEach((item) => {
            const prom = attachmentService.removeAttachment({ guid: item.guid })
            proms.push(prom)
          })
        }
        return Promise.all(proms)
      })
      .then(() => {
        if (dbReport && dbReport.audio) {
          const extension = path.extname(dbReport.audio)
          const s3Bucket = process.env.ASSET_BUCKET_REPORT
          return attachmentService.removeAttachmentFromS3({
            fileName: `${dbReport.guid}${extension}`,
            bucket: s3Bucket,
            type: 'audio',
            time: dbReport.reported_at
          })
        }
        return true
      })
      .then(() => {
        if (dbReport) {
          return reportsService.removeReportByGuid({ guid: dbReport.guid })
        }
        return false
      })
      .then(() => {
        res.status(200).send({ success: true })
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Could not remove report.'))
  })

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return reportsService.queryData(req)
      .then((data) => {
        res.status(200).send({
          reports: reportsService.formatRawReports(data.reports),
          total: data.total
        })
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, e.message || 'Could not find reports.'))
  })

module.exports = router
