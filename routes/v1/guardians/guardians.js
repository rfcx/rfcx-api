var models = require('../../../models')
var express = require('express')
var router = express.Router()
var hash = require('../../../utils/misc/hash')
var views = require('../../../views/v1')
var httpError = require('../../../utils/http-errors.js')
var passport = require('passport')
var Promise = require('bluebird')
var sequelize = require('sequelize')
var ValidationError = require('../../../utils/converter/validation-error')
var hasRole = require('../../../middleware/authorization/authorization').hasRole
const siteService = require('../../../services/sites/sites-service')
const userService = require('../../../services/users/users-service-legacy')
const guardiansService = require('../../../services/guardians/guardians-service')
const streamsService = require('../../../services/streams')
const arbimonService = require('../../../services/arbimon')
var Converter = require('../../../utils/converter/converter')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    var sitesQuery = {}

    return Promise.resolve()
      .then(() => {
        return userService.getUserByGuid(req.rfcx.auth_token_info.guid)
      })
      .then((user) => {
        return userService.getAllUserSiteGuids(user)
      })
      .then((guids) => {
        let sites = []
        if (req.query.sites) {
          sites = req.query.sites.filter((site) => {
            return guids.includes(site)
          })
        } else {
          sites = guids
        }
        sitesQuery.guid = { [models.Sequelize.Op.in]: sites }
        return models.Guardian.findAll({
          include: [{
            model: models.GuardianSite,
            as: 'Site',
            where: sitesQuery,
            attributes: ['guid', 'name']
          }],
          order: [['last_check_in', 'DESC']],
          limit: req.query.limit ? parseInt(req.query.limit) : req.rfcx.limit,
          offset: req.query.offset ? parseInt(req.query.offset) : req.rfcx.offset
        })
      })
      .bind({})
      .then(function (dbGuardian) {
        if (dbGuardian.length < 1) {
          httpError(req, res, 404, 'database')
          return null
        } else {
          return dbGuardian
        }
      })
      .then(function (dbGuardian) {
        if (dbGuardian) {
          this.dbGuardian = dbGuardian
          if (req.query.last_audio !== undefined && req.query.last_audio.toString() === 'true') {
            var proms = []
            dbGuardian.forEach(function (guardian) {
              var prom = models.GuardianAudio
                .findOne({
                  order: [['measured_at', 'DESC']],
                  include: [{
                    model: models.Guardian,
                    as: 'Guardian',
                    where: {
                      id: guardian.id
                    }
                  }]
                })
              proms.push(prom)
            })
            return Promise.all(proms)
          } else {
            return []
          }
        } else {
          return null
        }
      })
      .then(function (dbAudios) {
        if (dbAudios && dbAudios.length) {
          dbAudios.forEach(function (dbAudio) {
            if (dbAudio) {
              var guardian = this.dbGuardian.find(function (guardian) {
                return guardian.id === dbAudio.guardian_id
              })
              if (guardian) {
                guardian.last_audio = {
                  guid: dbAudio.guid,
                  measured_at: dbAudio.measured_at
                }
              }
            }
          }.bind(this))
        }
        if (this.dbGuardian) {
          res.status(200).json(views.models.guardian(req, res, this.dbGuardian))
        }
      })
      .catch(function (err) {
        console.log('failed to return guardians | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return guardians' }) }
      })
  })

router.route('/admin')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardianCreator', 'guardiansSitesAdmin']), (req, res) => {
    var sitesQuery = {}

    if (req.query.sites) {
      sitesQuery.guid = { [models.Sequelize.Op.in]: req.query.sites }
    }

    models.Guardian
      .findAll({
        include: [{
          model: models.GuardianSite,
          as: 'Site',
          where: sitesQuery,
          attributes: ['guid', 'name']
        }],
        order: [['last_check_in', 'DESC']],
        limit: req.query.limit ? parseInt(req.query.limit) : req.rfcx.limit,
        offset: req.query.offset ? parseInt(req.query.offset) : req.rfcx.offset
      })
      .bind({})
      .then(function (dbGuardian) {
        if (dbGuardian.length < 1) {
          httpError(req, res, 404, 'database')
          return null
        } else {
          return dbGuardian
        }
      })
      .then(function (dbGuardian) {
        if (dbGuardian) {
          this.dbGuardian = dbGuardian
          if (req.query.last_audio !== undefined && req.query.last_audio.toString() === 'true') {
            var proms = []
            dbGuardian.forEach(function (guardian) {
              var prom = models.GuardianAudio
                .findOne({
                  order: [['measured_at', 'DESC']],
                  include: [{
                    model: models.Guardian,
                    as: 'Guardian',
                    where: {
                      id: guardian.id
                    }
                  }]
                })
              proms.push(prom)
            })
            return Promise.all(proms)
          } else {
            return []
          }
        } else {
          return null
        }
      })
      .then(function (dbAudios) {
        if (dbAudios && dbAudios.length) {
          dbAudios.forEach(function (dbAudio) {
            if (dbAudio) {
              var guardian = this.dbGuardian.find(function (guardian) {
                return guardian.id === dbAudio.guardian_id
              })
              if (guardian) {
                guardian.last_audio = {
                  guid: dbAudio.guid,
                  measured_at: dbAudio.measured_at
                }
              }
            }
          }.bind(this))
        }
        if (this.dbGuardian) {
          res.status(200).json(views.models.guardian(req, res, this.dbGuardian))
        }
      })
      .catch(function (err) {
        console.log('failed to return guardians | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return guardians' }) }
      })
  })

router.route('/my')
  .get(passport.authenticate(['jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    return userService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then((user) => {
        return models.Guardian
          .findAll({
            where: { creator: user.id, is_private: true },
            include: [{ all: true }]
          })
      })
      .then((guardians) => {
        return guardiansService.formatGuardians(guardians)
      })
      .then((data) => {
        res.status(200).json(data)
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Couldn't get your guardians.") })
  })

router.route('/:guardian_id')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findAll({
        where: { guid: req.params.guardian_id },
        include: [{ all: true }],
        limit: 1
      }).then(function (dbGuardian) {
        if (dbGuardian.length < 1) {
          httpError(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.guardian(req, res, dbGuardian))
        }
      }).catch(function (err) {
        console.log('failed to return guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return guardian' }) }
      })
  })

router.route('/:guardian_id/public-info')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id },
        include: [{ all: true }]
      })
      .then(function (dbGuardian) {
        if (!dbGuardian) {
          httpError(req, res, 404, 'database')
        } else {
          res.status(200).json(views.models.guardianPublicInfo(dbGuardian)[0])
        }
      })
      .catch(function (err) {
        console.log('failed to return guardian | ' + err)
        if (err) { res.status(500).json({ msg: 'failed to return guardian' }) }
      })
  })

router.route('/register')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'guardianCreator']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString().toLowerCase()
    params.convert('token').toString().toLowerCase()
    params.convert('site_guid').optional().toString().toLowerCase()
    params.convert('shortname').optional().toString()

    params.validate()
      .then(() => {
        return models.Guardian.findOne({ where: { guid: transformedParams.guid } })
      })
      .then(async (guardian) => {
        if (guardian) {
          res.status(200).json(
            views.models.guardian(req, res, guardian)
          )
          return true
        } else {
          var tokenSalt = hash.randomHash(320)
          const siteGuid = transformedParams.site_guid ? transformedParams.site_guid : 'derc' // "RFCx lab" (derc) by default
          const site = await siteService.getSiteByGuid(siteGuid)
          let params = {
            guid: transformedParams.guid,
            shortname: transformedParams.shortname ? transformedParams.shortname : `_${transformedParams.guid.substr(0, 4)}`,
            latitude: 0,
            longitude: 0,
            auth_token_salt: tokenSalt,
            auth_token_hash: hash.hashedCredentials(tokenSalt, transformedParams.token),
            auth_token_updated_at: new Date(),
            site_id: site.id
          }
          if (req.rfcx.auth_token_info && req.rfcx.auth_token_info.userType === 'auth0') {
            params.creator = req.rfcx.auth_token_info.owner_id
            params.is_private = true
          }
          const dbGuardian = await models.Guardian.create(params)
          const dbStream = await streamsService.ensureStreamExistsForGuardian(dbGuardian)

          if (arbimonService.isEnabled && req.headers.authorization) {
            const idToken = req.headers.authorization
            const arbimonSite = await arbimonService.createSite({
              ...dbStream.toJSON(),
              latitude: 0,
              longitude: 0,
              altitude: 0
            }, idToken)
            await streamsService.update(dbStream, { external_id: arbimonSite.site_id })
          }
          res.status(200).json(views.models.guardian(req, res, dbGuardian))
        }
      })
      .catch(sequelize.ValidationError, e => {
        let message = 'Validation error'
        try {
          message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
        } catch (err) { }
        httpError(req, res, 400, null, message)
      })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(function (err) {
        console.log(err)
        res.status(500).json({ message: err.message, error: { status: 500 } })
      })
  })

// Guardian update

router.route('/:guid')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardianCreator']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('shortname').optional().toString()
    params.convert('latitude').optional().toFloat()
    params.convert('longitude').optional().toFloat()
    params.convert('is_visible').optional().toBoolean()

    params.validate()
    return guardiansService.getGuardianByGuid(req.params.guid)
      .then((guardian) => {
        return guardiansService.updateGuardian(guardian, transformedParams)
      })
      .then(async (guardian) => {
        try {
          const stream = await streamsService.get(guardian.guid)
          if (stream) {
            await streamsService.update(stream, {
              name: guardian.shortname
            })
          }
        } catch (e) { }
        return guardian
      })
      .then((guardian) => {
        return guardiansService.formatGuardian(guardian)
      })
      .then(function (json) {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => { httpError(req, res, 400, null, e.message) })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while updating the Guardian.') })
  })

module.exports = router
