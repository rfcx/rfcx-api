const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const ApiConverter = require('../../_utils/api-converter')
const requireUser = require('../../../common/middleware/authorization/authorization').requireTokenType('user')
const Promise = require('bluebird')
const sqlUtils = require('../../_utils/db/sql-cond-add')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const urls = require('../../_utils/misc/urls')
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole

function createOrUpdateTag (tag) {
  return models.GuardianAudio
    .findOne({
      where: { guid: tag.audio_id },
      include: [{ all: true }]
    })
    .then(function (dbAudio) {
      // var guid = tag.audio_id;

      // if begins_at_offset is not presented in request, then set it to 0
      tag.begins_at_offset = tag.begins_at_offset || 0
      // if ends_at_offset is not presented in request, then check if duration presented, if not set to audio file duration
      tag.ends_at_offset = tag.ends_at_offset || tag.duration ||
        (Math.round(1000 * dbAudio.dataValues.capture_sample_count / dbAudio.Format.sample_rate))

      tag.audio_id = dbAudio.id
      tag.begins_at = new Date(dbAudio.dataValues.measured_at)
      tag.ends_at = new Date(dbAudio.dataValues.measured_at)
      tag.begins_at.setMilliseconds(tag.begins_at.getMilliseconds() + tag.begins_at_offset)
      tag.ends_at.setMilliseconds(tag.ends_at.getMilliseconds() + tag.ends_at_offset)

      // first of all, check if user has already created tags with given type for selected audio file
      return models.GuardianAudioTag
        .findAll({
          where: {
            audio_id: dbAudio.id,
            type: tag.type,
            value: tag.value,
            tagged_by_user: tag.tagged_by_user
          }
        })
        .then(function (dbExistingTags) {
          // if user has already classified this file, then remove all previous tags
          if (dbExistingTags.length) {
            const promises = []
            for (let i = 0; i < dbExistingTags.length; i++) {
              promises.push(dbExistingTags[i].destroy())
            }
            return Promise.all(promises)
          }
          // if user has not classified this file, just go through
          return true
        })
        .then(function () {
          // create new tags
          return models.GuardianAudioTag.create(tag)
        })
    })
}

function processOne (req, res) {
  const guid = req.body.data.attributes.audioId
  req.body.data.attributes.taggedByUser = req.rfcx.auth_token_info.owner_id
  const converter = new ApiConverter('tag', req)
  const dbTag = converter.mapApiToSequelize(req.body)
  dbTag.audio_id = guid
  createOrUpdateTag(dbTag).then(function (dbTag) {
    const apiTag = converter.mapSequelizeToApi(dbTag)
    res.status(201).json(apiTag)
    return dbTag
  }).catch(function (err) {
    // creation failed... probable cause: uuid already existed, strange!
    console.log('Error while saving Tag | ', err)
    if (err) {
      res.status(500).json({ msg: 'The tag could not be generated. Maybe your id was not unique?' })
    }
  })
}

function processMany (req, res) {
  const promises = []
  const converter = new ApiConverter('tag', req)
  if (!Array.isArray(req.body.data.attributes)) {
    res.status(400).json({ msg: 'Attributes must be an array!' })
  }

  // iterate through all classifications inside `list` attribute
  for (let i = 0; i < req.body.data.attributes.length; i++) {
    const dbTag = converter.mapApiToSequelize(req.body.data.attributes[i])
    dbTag.tagged_by_user = req.rfcx.auth_token_info.owner_id
    promises.push(createOrUpdateTag(dbTag))
  }
  Promise.all(promises)
    .then(function (dbTags) {
      const api = { type: 'tags' }
      api.data = dbTags.map(function (dbTag) {
        return converter.mapSequelizeToApi(dbTag.dataValues)
      })
      res.status(201).json(api)
      return dbTags
    })
    .catch(function (err) {
      if (err.status && err.status === 403) {
        console.log('You\'re not allowed to save tags for this file |', err)
        res.status(403).json({ msg: err.msg || "You're not allowed to save tags for this file" })
      } else {
        console.log('Error in process of tagging |', err)
        res.status(500).json({ msg: 'Error in process of tagging save' })
      }
    })
}
router.route('/')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    try {
      if (req.body.data.type === 'tags') {
        processMany(req, res)
      } else {
        processOne(req, res)
      }
    } catch (e) {
      res.status(500).json({ msg: 'Error in process of tagging save' })
    }
  })

router.route('/audio/:audio_guid')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const opts = {
      audioGuid: req.params.audio_guid
    }

    const sql = 'SELECT t.begins_at_offset, t.ends_at_offset, t.confidence, t.tagged_by_user as user, t.tagged_by_model as model, t.type, ' +
                'CASE WHEN u.id=t.tagged_by_user THEN u.email ' +
                'WHEN m.id=t.tagged_by_model THEN m.shortname ' +
                'END as annotator ' +
              'FROM GuardianAudioTags t ' +
              'LEFT JOIN GuardianAudio a ON a.guid=:audioGuid ' +
              'LEFT JOIN Users u ON u.id=t.tagged_by_user ' +
              'LEFT JOIN AudioAnalysisModels m ON m.id=t.tagged_by_model ' +
              'WHERE a.id=t.audio_id and t.type in ("label", "classification") ' +
              'group by t.tagged_by_user, t.tagged_by_model, t.begins_at_offset order by t.begins_at_offset ASC, annotator ASC'

    models.sequelize.query(sql,
      { replacements: opts, type: models.sequelize.QueryTypes.SELECT })
      .then(function (data) {
        return views.models.groupTagsByCreator(req, res, data)
          .then(function (json) {
            res.status(200).json(json)
          })
      })
      .catch(function (err) {
        res.status(500).json({ msg: err })
      })
  })

router.route('/labels')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('labels', req)

    const sql = "SELECT DISTINCT value FROM GuardianAudioTags where type='label'"

    return models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT })
      .then(function (data) {
        const api = converter.mapSequelizeToApi({
          labels: data
        })
        api.links.self = urls.getApiUrl(req) + '/tags/labels'
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return labels | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return labels' }) }
      })
  })

router.route('/users')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('users', req)

    const sql = "SELECT DISTINCT u.email, u.username, u.type, u.guid FROM GuardianAudioTags t INNER JOIN Users u on u.id=t.tagged_by_user where t.type='label'"

    return models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT })
      .then(function (data) {
        const api = converter.mapSequelizeToApi({
          users: data
        })
        api.links.self = urls.getApiUrl(req) + '/tags/users'
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return users | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return users' }) }
      })
  })

router.route('/models')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('models', req)

    const sql = "SELECT DISTINCT m.shortname, m.guid FROM GuardianAudioTags t INNER JOIN AudioAnalysisModels m on m.id=t.tagged_by_model where t.type='classification'"

    return models.sequelize.query(sql, { type: models.sequelize.QueryTypes.SELECT })
      .then(function (data) {
        const api = converter.mapSequelizeToApi({
          models: data
        })
        api.links.self = urls.getApiUrl(req) + '/tags/models'
        res.status(200).json(api)
      })
      .catch(function (err) {
        console.log('failed to return models | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return models' }) }
      })
  })

router.route('/annotators')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('annotators', req)

    const sqlUsers = "SELECT DISTINCT u.email, u.username, u.type, u.guid FROM GuardianAudioTags t INNER JOIN Users u on u.id=t.tagged_by_user where t.type='label'"
    const sqlModels = "SELECT DISTINCT m.shortname, m.guid FROM GuardianAudioTags t INNER JOIN AudioAnalysisModels m on m.id=t.tagged_by_model where t.type='classification'"

    return models.sequelize.query(sqlUsers, { type: models.sequelize.QueryTypes.SELECT })
      .then(function (dataUsers) {
        return models.sequelize.query(sqlModels, { type: models.sequelize.QueryTypes.SELECT })
          .then(function (dataModels) {
            const api = converter.mapSequelizeToApi({
              users: dataUsers,
              models: dataModels
            })
            api.links.self = urls.getApiUrl(req) + '/tags/annotators'
            res.status(200).json(api)
          })
      })
      .catch(function (err) {
        console.log('failed to return models | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return models' }) }
      })
  })

router.route('/:tag_id')
  .get(passport.authenticate('token', { session: false }), requireUser, function (req, res) {
    const converter = new ApiConverter('tag', req)

    models.GuardianAudioTag
      .findOne({
        where: { guid: req.params.tag_id },
        include: [models.User]
      }).then(function (dbTag) {
        const api = converter.mapSequelizeToApi(dbTag)
        api.data.attributes.taggedByUser = dbTag.User.guid
        delete api.data.attributes.User
        res.status(200).json(api)
      }).catch(function (err) {
        if (err) {
          res.status(404).json({ msg: 'Tag with id ' + req.params.tag_id + ' does not exist.' })
        }
      })
  })

router.route('/classified/byannotator')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const converter = new ApiConverter('tags', req)

    const body = req.body

    if (!body.annotatorGuid || !body.annotatorGuid.length) {
      return httpErrorResponse(req, res, 400, null, 'Request does not contain user guid')
    }

    if (!body.audioCollection && (!body.audioGuids || !body.audioGuids.length)) {
      return httpErrorResponse(req, res, 400, null, 'Request does not contain audio guids')
    }

    if (!body.type || !body.type.length) {
      return httpErrorResponse(req, res, 400, null, 'Request does not contain tag type')
    }

    if (!body.value || !body.value.length) {
      return httpErrorResponse(req, res, 400, null, 'Request does not contain tag value')
    }

    function getAudioGuids () {
      return new Promise(function (resolve) {
        // if user specified audio collection, then load audio files from this collection
        // we can append separate audio guids later
        if (body.audioCollection) {
          return models.GuardianAudioCollection
            .findOne({
              where: { guid: body.audioCollection },
              include: [{ all: true }]
            })
            .then(function (dbGuardianAudioCollection) {
              return dbGuardianAudioCollection.GuardianAudios.map(function (item) {
                return item.guid
              })
            })
            .then(function (audioGuids) {
              // if user specified both audio collection and audio guids, then combine them into one array
              if (body.audioGuids && body.audioGuids.length) {
                audioGuids = audioGuids.concat(body.audioGuids)
              }
              resolve(audioGuids)
            })
            .catch(function () {
              httpErrorResponse(req, res, 404, null, 'Audio collection with given guid was not found')
            })
        } else {
          // if user specified only audio guids, then load only them
          resolve(body.audioGuids)
        }
      })
    }

    function combineQuery (audioGuids) {
      return new Promise(function (resolve) {
        const opts = {
          // set to user by default
          annotatorType: body.annotatorType || 'user',
          annotatorGuid: body.annotatorGuid,
          audios: audioGuids,
          type: body.type,
          value: body.value
        }

        let sql = 'SELECT a.guid, t.begins_at_offset, t.ends_at_offset, ROUND(AVG(t.confidence)) as confidence from GuardianAudioTags t '

        sql = sqlUtils.condAdd(sql, opts.annotatorType === 'user', 'INNER JOIN Users u ON u.guid=:annotatorGuid ')
        sql = sqlUtils.condAdd(sql, opts.annotatorType === 'model', 'INNER JOIN AudioAnalysisModels u ON u.guid=:annotatorGuid ')

        sql += 'INNER JOIN GuardianAudio a ON a.id=t.audio_id ' +
        'WHERE t.type=:type and t.value=:value and a.guid in (:audios) '

        sql = sqlUtils.condAdd(sql, opts.annotatorType === 'user', 'and t.tagged_by_user=u.id ')
        sql = sqlUtils.condAdd(sql, opts.annotatorType === 'model', 'and t.tagged_by_model=u.id ')

        sql += 'GROUP BY t.audio_id, t.begins_at_offset, t.ends_at_offset ' +
        'ORDER BY t.begins_at_offset ASC;'

        resolve({
          sql: sql,
          opts: opts,
          audioGuids: audioGuids
        })
      })
    }

    function runQuery (data) {
      return models.sequelize.query(data.sql, { replacements: data.opts, type: models.sequelize.QueryTypes.SELECT })
        .then(function (dbTags) {
          return views.models.countTagsByGuid(req, res, dbTags, data.audioGuids)
        })
        .then(function (dbTagsParsed) {
          const api = converter.cloneSequelizeToApi({
            tags: dbTagsParsed
          })

          res.status(200).json(api)
        })
    }

    getAudioGuids()
      .then(combineQuery)
      .then(runQuery)
      .catch(function (err) {
        console.log('failed to return tags | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return tags' }) }
      })
  })

module.exports = router
