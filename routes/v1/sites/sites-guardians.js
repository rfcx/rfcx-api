var models = require('../../../models')
var express = require('express')
var router = express.Router()
var views = require('../../../views/v1')
var httpError = require('../../../utils/http-errors.js')
var passport = require('passport')
passport.use(require('../../../middleware/passport-token').TokenStrategy)
var hasRole = require('../../../middleware/authorization/authorization').hasRole
var loggers = require('../../../utils/logger')
var Promise = require('bluebird')
var sequelize = require('sequelize')
var logError = loggers.errorLogger.log
var ForbiddenError = require('../../../utils/converter/forbidden-error')
const userService = require('../../../services/users/users-service')

router.route('/:site_id/guardians')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    return userService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then((user) => {
        return userService.getAllUserSiteGuids(user)
      })
      .then((guids) => {
        const guid = req.params.site_id
        if (!guids.includes(guid)) {
          throw new ForbiddenError(`You are not allowed to get guardians for site with guid ${guid}`)
        }
        return models.GuardianSite
          .findOne({
            where: { guid }
          })
      })
      .bind({})
      .then((dbSite) => {
        if (!dbSite) {
          throw new sequelize.EmptyResultError(`No site "${req.params.site_id}" was found.`)
        }
        this.dbSite = dbSite
        return models.Guardian.findAll({
          where: { site_id: dbSite.id },
          include: [{ all: true }],
          order: [['last_check_in', 'DESC']],
          limit: req.rfcx.limit,
          offset: req.rfcx.offset
        })
      })
      .then((dbGuardians) => {
        if (!dbGuardians.length) {
          throw new sequelize.EmptyResultError(`No guardians were found for site "${this.dbSite.guid}".`)
        }
        this.dbGuardians = dbGuardians
      })
      .then(() => {
        if (req.query.include_last_sync) {
          const proms = []
          this.dbGuardians.forEach((dbGuardan) => {
            const prom = models.GuardianMetaBattery.findOne({
              where: { guardian_id: dbGuardan.id },
              order: [['measured_at', 'DESC']]
            })
              .then((dbMetaBattery) => {
                if (dbMetaBattery) {
                  dbGuardan.last_sync = dbMetaBattery.measured_at
                  dbGuardan.battery_percent = dbMetaBattery.battery_percent
                }
                return true
              })
            proms.push(prom)
          })
          return Promise.all(proms)
        }
        return Promise.resolve()
      })
      .then(() => {
        if (req.query.last_audio) {
          const proms = []
          this.dbGuardians.forEach(function (guardian) {
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
              .then((dbAudio) => {
                if (dbAudio) {
                  guardian.last_audio = {
                    guid: dbAudio.guid,
                    measured_at: dbAudio.measured_at
                  }
                }
              })
            proms.push(prom)
          })
          return Promise.all(proms)
        }
        return Promise.resolve()
      })
      .then(() => {
        res.status(200).json(views.models.guardian(req, res, this.dbGuardians))
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch((err) => {
        logError('Failed to get guardians', { err })
        res.status(500).json({ msg: 'Failed to get guardians' })
      })
  })

module.exports = router
