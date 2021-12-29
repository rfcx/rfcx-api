const express = require('express')
const router = express.Router()
const hash = require('../../../utils/misc/hash')
const httpError = require('../../../utils/http-errors')
const passport = require('passport')
const Promise = require('bluebird')
const sequelize = require('sequelize')
const ValidationError = require('../../../utils/converter/validation-error')
const hasRole = require('../../../middleware/authorization/authorization').hasRole
const usersService = require('../../../services/users/users-service-legacy')
const usersFusedService = require('../../../services/users/fused')
const guardiansService = require('../../../services/guardians/guardians-service')
const sitesService = require('../../../services/sites/sites-service')
const streamsService = require('../../../services/streams')
const arbimonService = require('../../../services/arbimon')
const Converter = require('../../../utils/converter/converter')
const models = require('../../../models')
const modelsTimescale = require('../../../modelsTimescale')

router.route('/public')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.query, transformedParams)

    params.convert('guids').toArray()

    return params.validate()
      .then(() => {
        const proms = []
        const resObj = {}
        transformedParams.guids.forEach((guid) => {
          resObj[guid] = null // null by default
          const prom = guardiansService.getGuardianByGuid(guid, true)
            .then((guardian) => {
              if (guardian) {
                resObj[guid] = guardiansService.formatGuardianPublic(guardian)
              }
              return guardian
            })
          proms.push(prom)
        })
        return Promise.all(proms)
          .then(() => {
            return resObj
          })
      })
      .then((data) => {
        res.status(200).send(data)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, 'Error while getting guardians.'); console.log(e) })
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['guardianCreator', 'systemUser']), function (req, res) {
    return guardiansService.getGuardianByGuid(req.params.guid)
      .then((guardian) => {
        return guardiansService.formatGuardian(guardian)
      })
      .then((json) => {
        res.status(200).send(json)
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message) })
      .catch(e => { httpError(req, res, 500, e, `Error while getting guardian with guid "${req.params.guid}".`); console.log(e) })
  })

router.route('/:guid')
  .patch(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['appUser', 'systemUser']), function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('shortname').optional().toString()
    params.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
    params.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
    params.convert('altitude').optional().toFloat()
    params.convert('stream_id').optional().toString()
    params.convert('is_visible').optional().toBoolean()

    let mysqlTransaction, timescaleTransaction
    return params.validate()
      .then(async () => {
        mysqlTransaction = await models.sequelize.transaction()
        timescaleTransaction = await modelsTimescale.sequelize.transaction()

        const guardian = await guardiansService.getGuardianByGuid(req.params.guid)
        const updatedGuardian = await guardiansService.updateGuardian(guardian, transformedParams, { transaction: mysqlTransaction })

        await streamsService.update(updatedGuardian.stream_id, {
          latitude: transformedParams.latitude,
          longitude: transformedParams.longitude,
          altitude: transformedParams.altitude,
          is_public: transformedParams.is_visible
        }, { transaction: timescaleTransaction })

        if (arbimonService.isEnabled) {
          await arbimonService.updateSite({
            id: updatedGuardian.stream_id,
            name: transformedParams.shortname,
            latitude: transformedParams.latitude,
            longitude: transformedParams.longitude,
            altitude: transformedParams.altitude,
            is_private: !transformedParams.is_visible
          }, req.headers.authorization)
        }

        // Commit the transaction after doing update both guardian and stream
        await mysqlTransaction.commit()
        await timescaleTransaction.commit()
        return res.status(200).send(await guardiansService.formatGuardian(updatedGuardian))
      })
      .catch(async (e) => {
        if (mysqlTransaction) {
          await mysqlTransaction.rollback()
        }
        if (timescaleTransaction) {
          await timescaleTransaction.rollback()
        }
        httpError(req, res, 500, e, `Error while updating guardian with guid "${req.params.guid}".`); console.log(e)
      })
  })

router.route('/register')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser', 'guardianCreator']), async function (req, res) {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('guid').toString().toLowerCase()
    params.convert('shortname').optional().toString()
    params.convert('site').optional().toString()

    const token = hash.randomString(40)
    const pinCode = hash.randomString(4)

    try {
      await params.validate()

      const guardianAttrs = { ...transformedParams, token, pinCode }

      await usersFusedService.ensureUserSyncedFromToken(req)

      // Obtain creator info
      const dbUser = await usersService.getUserFromTokenInfo(req.rfcx.auth_token_info)
      if (dbUser) {
        guardianAttrs.creator_id = dbUser.id
        guardianAttrs.is_private = true
      }

      // Obtain site info
      if (transformedParams.site) {
        const dbSite = await sitesService.getSiteByGuid(transformedParams.site)
        if (dbSite) {
          guardianAttrs.site_id = dbSite.id
        }
      }

      // Create guardian
      const dbGuardian = await guardiansService.createGuardian(guardianAttrs)

      res.status(200).json({
        name: dbGuardian.shortname,
        guid: dbGuardian.guid,
        token: token,
        pin_code: pinCode,
        api_mqtt_host: process.env.GUARDIAN_BROKER_HOSTNAME,
        api_sms_address: process.env.GUARDIAN_API_SMS_ADDRESS,
        keystore_passphrase: process.env.GUARDIAN_KEYSTORE_PASSPHRASE
      })
    } catch (e) {
      console.log('v2/guardians/register error', e)
      if (e instanceof sequelize.ValidationError) {
        let message = 'Validation error'
        try {
          message = e.errors && e.errors.length ? e.errors.map((er) => er.message).join('; ') : e.message
        } catch (err) { }
        httpError(req, res, 400, null, message)
      } else if (e instanceof sequelize.EmptyResultError) {
        httpError(req, res, 404, null, e.message)
      } else {
        res.status(500).json({ message: e.message, error: { status: 500 } })
      }
    }
  })

module.exports = router
