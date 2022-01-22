const models = require('../../_models')
const express = require('express')
const router = express.Router()
const passport = require('passport')
const requireUser = require('../../../common/middleware/authorization/authorization').requireTokenType('user')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const Promise = require('bluebird')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const ApiConverter = require('../../_utils/api-converter')
const urls = require('../../_utils/misc/urls')
const sequelize = require('sequelize')
const sqlUtils = require('../../_utils/db/sql-cond-add')
const condAdd = sqlUtils.condAdd
const SensationsService = require('../../_services/legacy/sensations/sensations-service')
const AudioService = require('../../_services/audio/audio-service')
const S3Service = require('../../_services/legacy/s3/s3-service')
const pd = require('parallel-download')
const archiver = require('archiver')
const moment = require('moment')
const path = require('path')
const fs = require('fs')
const aws = require('../../_utils/external/aws.js').aws()
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const archiveUtil = require('../../_utils/misc/archive')
const dirUtil = require('../../_utils/misc/dir')
const fileUtil = require('../../_utils/misc/file')
const guidUtil = require('../../../utils/misc/guid')
const audioService = require('../../_services/audio/audio-service')
const boxesService = require('../../_services/audio/boxes-service')
const Converter = require('../../../common/converter')
const { ValidationError } = require('../../../common/error-handling/errors')
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { baseInclude, guardianAudioJson, guardianAudioLabels } = require('../../views/v1/models/guardian-audio').models

function filter (req) {
  let order = 'measured_at ASC'

  if (req.query.order && ['ASC', 'DESC', 'RAND'].indexOf(req.query.order.toUpperCase()) !== -1) {
    if (req.query.order === 'RAND') {
      order = [sequelize.fn('RAND')]
    } else {
      order = [['measured_at', req.query.order.toUpperCase()]]
    }
  }

  const mainClasuse = {}
  const siteClause = {}
  const guardianClause = {}

  if (req.query.siteGuid) {
    siteClause.guid = req.query.siteGuid
  }
  if (req.query.guardianGuid) {
    guardianClause.guid = req.query.guardianGuid
  }
  if (req.query.start) {
    if (!mainClasuse.measured_at) {
      mainClasuse.measured_at = {}
    }
    mainClasuse.measured_at[models.Sequelize.Op.gte] = req.query.start
  }
  if (req.query.end) {
    if (!mainClasuse.measured_at) {
      mainClasuse.measured_at = {}
    }
    mainClasuse.measured_at[models.Sequelize.Op.lte] = req.query.end
  }

  return models.GuardianAudio
    .findAll({
      where: mainClasuse,
      order: order,
      include: [
        {
          model: models.GuardianSite,
          as: 'Site',
          where: siteClause,
          attributes: ['guid', 'timezone', 'timezone_offset']
        },
        {
          model: models.Guardian,
          as: 'Guardian',
          where: guardianClause,
          attributes: ['guid']
        },
        {
          model: models.GuardianAudioFormat,
          as: 'Format',
          attributes: ['sample_rate']
        }
      ],
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    })
}

function getFilenameFromUrl (url) {
  const splittedUrl = url.split('/')
  return splittedUrl[splittedUrl.length - 1]
}

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return audioService.queryData(req)
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not find audio files.'))
  })

router.route('/filter')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const converter = new ApiConverter('audio', req)

    filter(req)
      .then(function (dbAudio) {
        return guardianAudioJson(dbAudio)
      })
      .then(function (audioJson) {
        const api = converter.cloneSequelizeToApi({ audios: audioJson })
        api.links.self = urls.getBaseUrl(req) + req.originalUrl
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return audios | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audios' }) }
      })
  })

router.route('/download/zip')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    // download mp3 if anything else is not specified
    const extension = req.query.extension || 'mp3'

    if (['mp3', 'opus', 'm4a'].indexOf(extension) === -1) {
      res.status(500).json({ msg: 'Specified files extension is not allowed. Available: "mp3", "opus" and "m4a"' })
    }

    const zipFilename = moment().format('MMDDYYYY_HHmmss') + '_audios.zip'
    const zipPath = path.join(process.env.CACHE_DIRECTORY, 'zip', zipFilename)

    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })
    archive.pipe(output)
    archive.on('error', function (err) {
      console.log('failed to get audios | ' + err)
      res.status(500).json({ msg: 'failed to get audios' })
    })
    output.on('close', () => {
      console.log(archive.pointer() + ' total bytes')
      console.log('archiver has been finalized and the output file descriptor has closed.')
      S3Service.putObject(zipPath, zipFilename, process.env.ASSET_BUCKET_ZIP)
        .then(function () {
          fs.unlink(zipPath, function (err) { if (err) { console.log(err) } })
          return aws.s3SignedUrl(process.env.ASSET_BUCKET_ZIP, zipFilename, 15)
        })
        .then(function (url) {
          return res.status(200).json({
            url: url
          })
        })
    })

    filter(req)
      .then(function (dbAudios) {
        if (!dbAudios.length) {
          fs.unlink(zipPath, function (err) { if (err) { console.log(err) } })
          throw new sequelize.EmptyResultError('No files were found for this query.')
        } else {
          return AudioService.getGuidsFromDbAudios(dbAudios)
        }
      })
      .then(function (audioGuids) {
        return AudioService.combineAssetsUrls(req, audioGuids, extension)
      })
      .then(pd)
      .then(function (messages) {
        messages.forEach(function (mes) {
          archive.append(mes.content, { name: getFilenameFromUrl(mes.url) })
        })
        archive.finalize()
        return true
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(function (err) {
        console.log('failed to get audios | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to get audios' }) }
      })
  })

router.route('/filter/by-tags')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const converter = new ApiConverter('audio', req)

    const filterOpts = {}

    if (req.query.limit) {
      filterOpts.limit = parseInt(req.query.limit)
    }

    if (req.query.tagType) {
      filterOpts.tagType = req.query.tagType
    }

    if (req.query.tagValue) {
      filterOpts.tagValue = req.query.tagValue
    }

    if (req.query.userGuid) {
      filterOpts.userGuid = req.query.userGuid
    }

    if (req.query.modelGuid) {
      filterOpts.modelGuid = req.query.modelGuid
    }

    if (req.query.minConfidence) {
      filterOpts.minConfidence = parseFloat(req.query.minConfidence)
    }

    if (req.query.maxConfidence) {
      filterOpts.maxConfidence = parseFloat(req.query.maxConfidence)
    }

    if (req.query.minCount) {
      filterOpts.minCount = parseInt(req.query.minCount)
    }

    let sql = 'SELECT DISTINCT a.id as audioId, a.guid, count(a.id) as count FROM GuardianAudio a ' +
                'LEFT JOIN GuardianAudioTags t on a.id=t.audio_id '

    sql = condAdd(sql, filterOpts.userGuid, ' INNER JOIN Users u on u.id = t.tagged_by_user')
    sql = condAdd(sql, filterOpts.modelGuid, ' INNER JOIN AudioAnalysisModels m on m.id = t.tagged_by_model')

    sql = condAdd(sql, true, ' where 1=1')
    sql = condAdd(sql, filterOpts.userGuid, ' and u.guid = :userGuid')
    sql = condAdd(sql, filterOpts.modelGuid, ' and m.guid = :modelGuid')

    sql = condAdd(sql, filterOpts.tagType, ' and t.type = :tagType')
    sql = condAdd(sql, filterOpts.tagValue, ' and t.value = :tagValue')
    sql = condAdd(sql, filterOpts.minConfidence, ' and t.confidence >= :minConfidence')
    sql = condAdd(sql, filterOpts.maxConfidence, ' and t.confidence <= :maxConfidence')
    sql = condAdd(sql, true, ' group by a.guid')
    sql = condAdd(sql, filterOpts.minCount, ' HAVING count(a.id) >= :minCount')
    sql = condAdd(sql, filterOpts.limit, ' LIMIT :limit')

    return models.sequelize.query(sql,
      { replacements: filterOpts, type: models.sequelize.QueryTypes.SELECT }
    )
      .then(function (dbAudio) {
        const guids = dbAudio.map(function (item) {
          return item.guid
        })

        const api = converter.cloneSequelizeToApi({ audios: guids })
        api.links.self = urls.getBaseUrl(req) + req.originalUrl

        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return audios | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audios' }) }
      })
  })

router.route('/labels')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return boxesService.getData(req)
      .then((data) => {
        boxesService.calculateTimeOffsetsInSeconds(data.labels)
        boxesService.combineAudioUrls(data.labels)
        return data
      })
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not find audio labels data.'))
  })

router.route('/label-values')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return boxesService.getLabelValues(req)
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not find label values.'))
  })

router.route('/labels/download')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const tempGuid = guidUtil.generate()
    const annotationsPath = path.join(process.env.CACHE_DIRECTORY, 'annotations')

    return dirUtil.ensureDirExists(annotationsPath)
      .then(() => {
        return boxesService.queryData(req)
      })
      .then((labels) => {
        if (!labels.length) {
          throw new EmptyResultError('No annotations found for requested parameters.')
        }
        boxesService.calculateTimeOffsetsInSeconds(labels)
        return boxesService.formatDataForDownload(labels, req.query.excludeYAxis === 'true')
      })
      .then((files) => {
        return archiveUtil.archiveStrings(annotationsPath, `annotations-${tempGuid}.zip`, files)
      })
      .then((zipPath) => {
        return fileUtil.serveFile(res, zipPath, 'annotations.zip', 'application/zip, application/octet-stream', !!req.query.inline)
      })
      .catch(EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(e => { console.log(e); httpErrorResponse(req, res, 500, e, 'Error while searching for annotations.') })
  })

router.route('/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [
          ...baseInclude,
          {
            model: models.GuardianCheckIn,
            as: 'CheckIn',
            attributes: ['guid']
          }
        ]
      }).then(function (dbAudio) {
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      }).catch(function (err) {
        console.log('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

router.route('/:audio_id/createSensations')
  .post(passport.authenticate('token', { session: false }), function (req, res) {
    SensationsService.createSensationsFromGuardianAudio(req.params.audio_id)
      .then(sensations => res.status(200).json(sensations))
      .catch(err => {
        console.log('Failed to create sensations | ' + err)
        if (err) {
          res.status(500).json({ msg: 'failed to create sensations' })
        }
      })
  })

router.route('/:guid/boxes')
  .post(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('boxes').toArray()

    params.validate()
      .bind({})
      .then(() => {
        return audioService.getAudioByGuid(req.params.guid)
      })
      .then((audio) => {
        this.audio = audio
        return audioService.removeBoxesForAudioFromUser(audio, req.rfcx.auth_token_info.owner_id)
      })
      .then(() => {
        return audioService.createBoxesForAudio(this.audio, transformedParams.boxes, req.rfcx.auth_token_info.owner_id)
      })
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(e => httpErrorResponse(req, res, 500, e, e.message || 'Could not create boxes for audio file.'))
  })

// implements a majority vote for each sample in the audio file
router.route('/:audio_id/labels')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    // this is a greatest n per group for the greatest count of labels applied to each window
    // it uses the id of the tag as a tiebreaker in case that equally many votes are cast
    // for two or more labels
    const sql = `SELECT c1.begins_at, c1.label, c1.votes FROM
        (SELECT t.begins_at, t.value as label, count(t.value) as votes, min(t.id) as tagId from GuardianAudioTags t
        INNER JOIN GuardianAudio a ON t.audio_id=a.id
        where t.type='label'
        and a.guid=:audi_id
        group by t.audio_id, t.begins_at, t.value) c1
        LEFT OUTER JOIN
        (SELECT t.begins_at, t.value as label, count(t.value) as votes, min(t.id) as tagId from GuardianAudioTags t
        INNER JOIN GuardianAudio a ON t.audio_id=a.id
        where t.type='label'
        and a.guid=:audio_id
        group by t.audio_id, t.begins_at, t.value) c2
        ON c1.begins_at=c2.begins_at and ( c1.votes < c2.votes or (c1.votes = c2.votes and c1.tagId < c2.tagId))
        WHERE c2.begins_at IS NULL
        ORDER BY c1.begins_at ASC`

    const filter = {
      audio_id: req.params.audio_id
    }

    models.sequelize.query(sql,
      { replacements: filter, type: models.sequelize.QueryTypes.SELECT }
    ).then(function (labels) {
      return guardianAudioLabels(req, res, labels)
        .then(function (labelsJson) {
          res.status(200).json(labelsJson)
        })
    }).catch(function (err) {
      console.log('failed to return labels | ' + err)
      if (err) { res.status(500).json({ msg: 'failed to return the right labels.' }) }
    })
  })

router.route('/nextafter/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function (dbAudio) {
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function (resolve) {
            return resolve(null)
          })
        } else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  [models.Sequelize.Op.gt]: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{ all: true }],
              limit: 1,
              order: [['measured_at', 'ASC']]
            })
        }
      })
      .then(function (dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpErrorResponse(req, res, 404, 'database')
        }
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      })
      .catch(function (err) {
        console.log('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

router.route('/prevbefore/:audio_id')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function (dbAudio) {
        // if current audio was not find, then resolve promise with null to return 404 error
        if (!dbAudio) {
          return new Promise(function (resolve) {
            return resolve(null)
          })
        } else {
          return models.GuardianAudio
            .findOne({
              where: {
                measured_at: {
                  [models.Sequelize.Op.lt]: dbAudio.measured_at
                },
                guardian_id: dbAudio.guardian_id,
                site_id: dbAudio.site_id
              },
              include: [{ all: true }],
              limit: 1,
              order: [['measured_at', 'DESC']]
            })
        }
      })
      .then(function (dbAudio) {
        // if current audio or next audio was not found, return 404
        if (!dbAudio) {
          return httpErrorResponse(req, res, 404, 'database')
        }
        return guardianAudioJson(dbAudio)
          .then(function (audioJson) {
            res.status(200).json(audioJson)
          })
      })
      .catch(function (err) {
        console.log('failed to return audio | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return audio' }) }
      })
  })

module.exports = router
