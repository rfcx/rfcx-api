const express = require('express')
const router = express.Router()
const hash = require('../../../utils/misc/hash')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const { httpErrorHandler } = require('../../../common/error-handling/http.js')
const passport = require('passport')
const Promise = require('bluebird')
const sequelize = require('sequelize')
const { ValidationError } = require('../../../common/error-handling/errors')
const { hasRole } = require('../../../common/middleware/authorization/authorization')
const usersService = require('../../../common/users/users-service-legacy')
const usersFusedService = require('../../../common/users/fused')
const guardiansService = require('../../_services/guardians/guardians-service')
const sitesService = require('../../_services/sites/sites-service')
const streamsService = require('../../../core/_services/streams')
const arbimonService = require('../../../core/_services/arbimon')
const Converter = require('../../../utils/converter')
const modelsLegacy = require('../../_models')
const models = require('../../../models')
const { EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')

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
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, 'Error while getting guardians.'); console.log(e) })
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    return guardiansService.getGuardianByGuid(req.params.guid)
      .then((guardian) => {
        res.send(guardiansService.formatGuardian(guardian))
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while getting guardian with guid "${req.params.guid}".`); console.log(e) })
  })

router.route('/:guid')
  .patch(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const user = req.rfcx.auth_token_info
    const updatableBy = user.is_super || user.has_system_role ? undefined : user.id
    const converter = new Converter(req.body, {})

    converter.convert('shortname').optional().toString()
    converter.convert('latitude').optional().toFloat().minimum(-90).maximum(90)
    converter.convert('longitude').optional().toFloat().minimum(-180).maximum(180)
    converter.convert('altitude').optional().toFloat()
    converter.convert('stream_id').optional().toString()
    converter.convert('is_visible').optional().toBoolean()

    let mysqlTransaction, timescaleTransaction
    return converter.validate()
      .then(async (params) => {
        mysqlTransaction = await modelsLegacy.sequelize.transaction()
        timescaleTransaction = await models.sequelize.transaction()

        // Check the user has permission to write to stream
        await streamsService.update(params.stream_id, {
          latitude: params.latitude,
          longitude: params.longitude,
          altitude: params.altitude,
          is_public: params.is_visible
        }, { updatableBy, transaction: timescaleTransaction }).catch(e => {
          if (e instanceof EmptyResultError || e instanceof ForbiddenError) {
            throw new ValidationError('stream id does not exist or is not updatable by user')
          }
          throw e
        })

        const guardian = await guardiansService.getGuardianByGuid(req.params.guid)

        // Update the last deployed timestamp whenever stream id changes
        if (guardian.stream_id === null || guardian.stream_id !== params.stream_id) {
          params.last_deployed = models.sequelize.literal('CURRENT_TIMESTAMP')
        }

        const updatedGuardian = await guardiansService.updateGuardian(guardian, params, { transaction: mysqlTransaction })

        if (arbimonService.isEnabled) {
          await arbimonService.updateSite({
            id: params.stream_id,
            name: params.shortname,
            latitude: params.latitude,
            longitude: params.longitude,
            altitude: params.altitude,
            is_private: !params.is_visible
          }, req.headers.authorization)
        }

        // Commit the transaction after doing update both guardian and stream
        await mysqlTransaction.commit()
        await timescaleTransaction.commit()
        return res.send(guardiansService.formatGuardian(updatedGuardian))
      })
      .catch(async (e) => {
        if (mysqlTransaction) {
          await mysqlTransaction.rollback()
        }
        if (timescaleTransaction) {
          await timescaleTransaction.rollback()
        }
        throw e
      })
      .catch(httpErrorHandler(req, res, 'Failed updating guardian'))
  })

router.route('/register')
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), async function (req, res) {
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
        httpErrorResponse(req, res, 400, null, message)
      } else if (e instanceof sequelize.EmptyResultError) {
        httpErrorResponse(req, res, 404, null, e.message)
      } else {
        res.status(500).json({ message: e.message, error: { status: 500 } })
      }
    }
  })

module.exports = router
