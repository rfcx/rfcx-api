const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../utils/http-error-handler')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole
const Promise = require('bluebird')
const sequelize = require('sequelize')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const userService = require('../../../common/users/users-service-legacy')

router.route('/:site_id/guardians')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    return userService.getAllUserSiteGuids(req.rfcx.auth_token_info.guid)
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
          where: {
            site_id: dbSite.id,
            ...req.query.is_visible !== undefined ? { is_visible: req.query.is_visible === 'true' } : {}
          },
          include: [],
          order: [['last_check_in', 'DESC']],
          limit: req.rfcx.limit,
          offset: req.rfcx.offset
        })
      })
      .then((dbGuardians) => {
        if (!dbGuardians.length) {
          throw new sequelize.EmptyResultError(`No guardians were found for site "${this.dbSite.guid}".`)
        }
        dbGuardians.forEach((dbGuardian) => {
          dbGuardian.Site = this.dbSite
        })
        this.dbGuardians = dbGuardians
      })
      .then(() => {
        if (req.query.include_last_sync) {
          const proms = []
          this.dbGuardians.forEach((dbGuardan) => {
            const query = { where: { guardian_id: dbGuardan.id }, order: [['measured_at', 'DESC']] }
            proms.push(models.GuardianMetaBattery.findOne(query).then((dbMetaBattery) => {
              if (dbMetaBattery) {
                dbGuardan.last_sync = dbMetaBattery.measured_at
                dbGuardan.battery_percent_internal = dbMetaBattery.battery_percent
              }
            }))
            proms.push(models.GuardianMetaSentinelPower.findOne(query).then((dbMetaSentinelPower) => {
              if (dbMetaSentinelPower) {
                dbGuardan.battery_percent = dbMetaSentinelPower.battery_state_of_charge
              }
            }))
          })
          return Promise.all(proms)
        }
        return Promise.resolve()
      })
      .then(() => {
        if (req.query.include_hardware) {
          const proms = []
          this.dbGuardians.forEach((dbGuardan) => {
            const prom = models.GuardianMetaHardware.findOne({
              where: { guardian_id: dbGuardan.id },
              attributes: ['phone_imei', 'phone_sim_number', 'phone_sim_serial']
            })
              .then((dbMetaHardware) => {
                if (dbMetaHardware) {
                  dbGuardan.phone_imei = dbMetaHardware.phone_imei
                  dbGuardan.phone_sim_number = dbMetaHardware.phone_sim_number
                  dbGuardan.phone_sim_serial = dbMetaHardware.phone_sim_serial
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
            const prom = models.GuardianAudio
              .findOne({
                order: [['measured_at', 'DESC']],
                include: [{
                  model: models.Guardian,
                  as: 'Guardian',
                  where: {
                    id: guardian.id
                  },
                  attributes: ['id']
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
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => { httpErrorResponse(req, res, 403, null, e.message) })
      .catch((err) => {
        console.error('Failed to get guardians', err)
        res.status(500).json({ msg: 'Failed to get guardians' })
      })
  })

module.exports = router
