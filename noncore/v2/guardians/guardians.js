const express = require('express')
const router = express.Router()
const { randomString } = require('../../../common/crypto/random')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const { httpErrorHandler } = require('../../../common/error-handling/http')
const passport = require('passport')
const sequelize = require('sequelize')
const { ValidationError } = require('../../../common/error-handling/errors')
const usersService = require('../../../common/users/users-service-legacy')
const usersFusedService = require('../../../common/users/fused')
const guardiansService = require('../../_services/guardians/guardians-service')
const sitesService = require('../../_services/sites/sites-service')
const streamDao = require('../../../core/streams/dao')
const arbimonService = require('../../../core/_services/arbimon')
const Converter = require('../../../common/converter')
const modelsLegacy = require('../../_models')
const models = require('../../../core/_models')
const { EmptyResultError, ForbiddenError } = require('../../../common/error-handling/errors')
const views = require('../../views/v1')

router.route('/')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    const user = req.rfcx.auth_token_info
    const converter = new Converter(req.query, {}, true)
    converter.convert('project').optional().toString()
    converter.convert('last_audio').optional().toBoolean()
    converter.convert('include_hardware').optional().toBoolean()
    converter.convert('include_last_sync').optional().toBoolean()
    converter.convert('is_visible').optional().toBoolean()
    converter.convert('offset').default(0).toInt()
    converter.convert('limit').default(100).toInt()

    return converter.validate()
      .then(params => {
        const { project, limit, offset, lastAudio, isVisible, includeLastSync, includeHardware } = params
        const readableBy = user && (user.is_super || user.has_system_role || user.has_stream_token) ? undefined : user.id
        const order = [['last_check_in', 'DESC']]
        const where = project !== undefined ? { project_id: project === 'null' ? { [models.Sequelize.Op.is]: null } : project, ...isVisible !== undefined ? { is_visible: isVisible === 'true' } : {} } : null
        return guardiansService.listMonitoringData({ readableBy, where, order, limit, offset, lastAudio, includeLastSync, includeHardware })
      })
      .then(dbGuardian => res.status(200).json(views.models.guardian(req, res, dbGuardian)))
      .catch(httpErrorHandler(req, res, 'Failed getting guardians'))
  })

router.route('/:guid')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), function (req, res) {
    return guardiansService.getGuardianByGuid(req.params.guid)
      .then((guardian) => {
        res.send(guardiansService.formatGuardian(guardian))
      })
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(sequelize.EmptyResultError, e => { httpErrorResponse(req, res, 404, null, e.message) })
      .catch(e => { httpErrorResponse(req, res, 500, e, `Error while getting guardian with guid "${req.params.guid}".`); console.error(e) })
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
        await streamDao.update(params.stream_id, {
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
        const stream = await streamDao.get(params.stream_id, { fields: ['project_id', 'timezone'] })
        if (stream.project_id !== undefined) {
          params.project_id = stream.project_id
        }
        if (params.latitude !== undefined && params.longitude !== undefined) {
          params.timezone = stream.timezone
        }
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
    params.convert('token').optional().toString()
    params.convert('pin_code').optional().toString()

    try {
      await params.validate()

      const token = transformedParams.token || randomString(40)
      const pinCode = transformedParams.pin_code || randomString(4)

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
      console.error('v2/guardians/register error', e)
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
