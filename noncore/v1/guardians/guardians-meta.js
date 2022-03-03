const models = require('../../_models')
const express = require('express')
const router = express.Router()
const views = require('../../views/v1')
const { httpErrorResponse } = require('../../../common/error-handling/http')
const passport = require('passport')
passport.use(require('../../../common/middleware/passport-token').TokenStrategy)
const hasRole = require('../../../common/middleware/authorization/authorization').hasRole

router.route('/:guardian_id/meta/:meta_type')
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), (req, res) => {
    const metaType = req.params.meta_type
    const modelLookUp = {
      cpu: {
        model: 'GuardianMetaCPU',
        viewFunction: 'guardianMetaCPU',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          cpu_percent: 'percent_usage',
          cpu_clock: 'clock_speed'
        }
      },
      memory: {
        model: 'GuardianMetaMemory',
        viewFunction: 'guardianMetaMemory',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          system_bytes_available: 'system_bytes_available',
          system_bytes_used: 'system_bytes_used',
          system_bytes_minimum: 'system_bytes_minimum'
        }
      },
      datatransfer: {
        model: 'GuardianMetaDataTransfer',
        viewFunction: 'guardianMetaDataTransfer',
        timeStampColumn: 'ended_at',
        dbToJsonMap: {
          started_at: 'started_at',
          ended_at: 'ended_at',
          mobile_bytes_received: 'mobile_bytes_received',
          mobile_bytes_sent: 'mobile_bytes_sent',
          mobile_total_bytes_received: 'mobile_total_bytes_received',
          mobile_total_bytes_sent: 'mobile_total_bytes_sent',
          network_bytes_received: 'network_bytes_received',
          network_bytes_sent: 'network_bytes_sent',
          network_total_bytes_received: 'network_total_bytes_received',
          network_total_bytes_sent: 'network_total_bytes_sent',
          bytes_received: 'bytes_received',
          bytes_sent: 'bytes_sent',
          total_bytes_received: 'total_bytes_received',
          total_bytes_sent: 'total_bytes_sent'
        }
      },
      lightmeter: {
        model: 'GuardianMetaLightMeter',
        viewFunction: 'guardianMetaLightMeter',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          luminosity: 'luminosity'
        }
      },
      network: {
        model: 'GuardianMetaNetwork',
        viewFunction: 'guardianMetaNetwork',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          signal_strength: 'signal_strength',
          network_type: 'network_type',
          carrier_name: 'carrier_name'
        }
      },
      offline: {
        model: 'GuardianMetaOffline',
        viewFunction: 'guardianMetaOffline',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          offline_duration: 'offline_duration',
          carrier_name: 'carrier_name'
        }
      },
      battery: {
        model: 'GuardianMetaBattery',
        viewFunction: 'guardianMetaBattery',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          battery_percent: 'percent_charged',
          check_in_id: 'check_in_id'
        }
      },
      power: {
        model: 'GuardianMetaPower',
        viewFunction: 'guardianMetaPower',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          is_powered: 'is_powered',
          is_charged: 'is_charged'
        }
      },
      'sentinel-power': {
        model: 'GuardianMetaSentinelPower',
        viewFunction: 'guardianMetaSentinelPower',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          battery_state_of_charge: 'battery_state_of_charge',
          battery_power: 'battery_power',
          system_power: 'system_power',
          check_in_id: 'check_in_id',
          battery_current: 'battery_current',
          input_current: 'input_current',
          system_current: 'system_current',
          battery_voltage: 'battery_voltage'
        }
      },
      accelerometer: {
        model: 'GuardianMetaSentinelAccelerometer',
        viewFunction: 'guardianMetaSentinelAccelerometer',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          x_milli_g_force_accel: 'x_milli_g_force_accel',
          y_milli_g_force_accel: 'y_milli_g_force_accel',
          z_milli_g_force_accel: 'z_milli_g_force_accel'
        }
      },
      diskusage: {
        model: 'GuardianMetaDiskUsage',
        viewFunction: 'guardianMetaDiskUsage',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at'
        }
      },
      messages: {
        model: 'GuardianMetaMessage',
        viewFunction: 'guardianMetaMessages',
        timeStampColumn: 'received_at',
        dbToJsonMap: {
          guid: 'guid',
          received_at: 'received_at',
          sent_at: 'sent_at',
          address: 'address',
          body: 'body'
        }
      },
      checkins: {
        model: 'GuardianCheckIn',
        viewFunction: 'guardianMetaCheckIns',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          queued_at: 'queued_at',
          request_latency_guardian: 'latency',
          guardian_queued_checkins: 'queued'
        }
      },
      'checkin-status': {
        model: 'GuardianMetaCheckInStatus',
        viewFunction: 'guardianMetaCheckInStatus',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          queued_size_bytes: 'queued_size_bytes',
          meta_size_bytes: 'meta_size_bytes',
          stashed_size_bytes: 'stashed_size_bytes',
          archived_size_bytes: 'archived_size_bytes',
          vault_size_bytes: 'vault_size_bytes'
        }
      },
      mqtt: {
        model: 'GuardianMetaMqttBrokerConnection',
        viewFunction: 'guardianMetaMqttBrokerConnections',
        timeStampColumn: 'connected_at',
        dbToJsonMap: {
          connected_at: 'connected_at',
          connection_latency: 'connection_latency',
          subscription_latency: 'subscription_latency'
        }
      },
      sms: {
        model: 'GuardianMetaMessage',
        viewFunction: 'guardianMetaMessages',
        timeStampColumn: 'received_at',
        dbToJsonMap: {
          address: 'address',
          body: 'body'
        }
      },
      reboots: {
        model: 'GuardianMetaReboot',
        viewFunction: 'guardianMetaReboots',
        timeStampColumn: 'completed_at',
        dbToJsonMap: {
          completed_at: 'completed_at'
        }
      }
    }

    req.rfcx.limit = (req.query.limit == null) ? 1 : parseInt(req.query.limit)
    if (req.rfcx.limit > 5000) {
      req.rfcx.limit = 5000
    } else if (req.rfcx.limit < 1) {
      req.rfcx.limit = 1
    }

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const dbQuery = {
          where: { guardian_id: dbGuardian.id },
          order: [[modelLookUp[metaType].timeStampColumn, 'DESC']],
          //    limit: req.rfcx.limit,
          offset: req.rfcx.offset
        }

        // if we have datetime constraints, add them to the query
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn] = {}
        }
        if (req.rfcx.ending_before != null) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn][models.Sequelize.Op.lt] = req.rfcx.ending_before
        }
        if (req.rfcx.starting_after != null) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn][models.Sequelize.Op.gt] = req.rfcx.starting_after
        }

        // if we have no datetime constraints, make sure we impose the limit within the database query (rather than in the view function)
        if ((req.rfcx.ending_before == null) && (req.rfcx.starting_after == null)) {
          dbQuery.limit = req.rfcx.limit
        }

        return models[modelLookUp[metaType].model]
          .findAll(dbQuery)
          .then(function (dbMeta) {
            res.status(200).json(
              views.models[modelLookUp[metaType].viewFunction](
                req, res,
                (req.rfcx.order === 'DESC') ? dbMeta : dbMeta.reverse(),
                modelLookUp[metaType]
              )
            )

            return null
          }).catch(function (err) {
            console.error('failure to retrieve meta data: ' + err)
            httpErrorResponse(req, res, 500, 'database')
          })
      }).catch(function (err) {
        console.error('failure to retrieve guardian: ' + err)
        httpErrorResponse(req, res, 404, 'database')
      })
  })

router.route('/:guardian_id/meta2/:meta_type')
  .get(passport.authenticate('token', { session: false }), function (req, res) {
    const metaType = req.params.meta_type

    const modelLookUp = {
      cpu: {
        model: 'GuardianMetaCPU',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          cpu_percent: 'percent_usage',
          cpu_clock: 'clock_speed'
        }
      },
      datatransfer: {
        model: 'GuardianMetaDataTransfer',
        timeStampColumn: 'ended_at',
        dbToJsonMap: {
          started_at: 'started_at',
          ended_at: 'ended_at',
          bytes_received: 'bytes_received',
          bytes_sent: 'bytes_sent',
          total_bytes_received: 'total_bytes_received',
          total_bytes_sent: 'total_bytes_sent'
        }
      },
      lightmeter: {
        model: 'GuardianMetaLightMeter',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          luminosity: 'luminosity'
        }
      },
      network: {
        model: 'GuardianMetaNetwork',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          signal_strength: 'signal_strength',
          network_type: 'network_type',
          carrier_name: 'carrier_name'
        }
      },
      offline: {
        model: 'GuardianMetaOffline',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          offline_duration: 'offline_duration',
          carrier_name: 'carrier_name'
        }
      },
      power: {
        model: 'GuardianMetaPower',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          is_powered: 'is_powered',
          is_charged: 'is_charged'
        }
      },
      messages: {
        model: 'GuardianMetaMessage',
        timeStampColumn: 'received_at',
        dbToJsonMap: {
          guid: 'guid',
          received_at: 'received_at',
          sent_at: 'sent_at',
          address: 'address',
          body: 'body'
        }
      },
      checkins: {
        model: 'GuardianCheckIn',
        timeStampColumn: 'measured_at',
        dbToJsonMap: {
          measured_at: 'measured_at',
          queued_at: 'queued_at',
          request_latency_guardian: 'latency',
          guardian_queued_checkins: 'queued'
        }
      },
      reboots: {
        model: 'GuardianMetaReboot',
        viewFunction: 'guardianMetaReboots',
        timeStampColumn: 'completed_at',
        dbToJsonMap: {
          completed_at: 'completed_at'
        }
      }
    }

    req.rfcx.limit = (req.query.limit == null) ? 1 : parseInt(req.query.limit)
    if (req.rfcx.limit > 5000) {
      req.rfcx.limit = 5000
    } else if (req.rfcx.limit < 1) {
      req.rfcx.limit = 1
    }

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function (dbGuardian) {
        const dbQuery = {
          where: { guardian_id: dbGuardian.id },
          order: [[modelLookUp[metaType].timeStampColumn, 'DESC']],
          //    limit: req.rfcx.limit,
          offset: req.rfcx.offset
        }

        // if we have datetime constraints, add them to the query
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn] = {}
        }
        if (req.rfcx.ending_before != null) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn][models.Sequelize.Op.lt] = req.rfcx.ending_before
        }
        if (req.rfcx.starting_after != null) {
          dbQuery.where[modelLookUp[metaType].timeStampColumn][models.Sequelize.Op.gt] = req.rfcx.starting_after
        }

        // if we have no datetime constraints, make sure we impose the limit within the database query (rather than in the view function)
        if ((req.rfcx.ending_before == null) && (req.rfcx.starting_after == null)) {
          dbQuery.limit = req.rfcx.limit
        }

        models[modelLookUp[metaType].model]
          .findAll(dbQuery)
          .then(function (dbMeta) {
            res.status(200).json(
              views.models.guardianMeta(
                req, res,
                (req.rfcx.order === 'DESC') ? dbMeta : dbMeta.reverse(),
                modelLookUp[metaType]
              )
            )
          }).catch(function (err) {
            console.error('failure to retrieve meta data: ' + err)
            httpErrorResponse(req, res, 500, 'database')
          })
      }).catch(function (err) {
        console.error('failure to retrieve guardian: ' + err)
        httpErrorResponse(req, res, 404, 'database')
      })
  })

module.exports = router
