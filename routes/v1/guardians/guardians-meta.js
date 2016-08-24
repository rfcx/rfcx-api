var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/meta/:meta_type")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var meta_type = req.params.meta_type;

    var modelLookUp = {
      battery: {
        model: "GuardianMetaBattery",
        viewFunction: "guardianMetaBattery",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          battery_percent: "percent_charged",
          battery_temperature: "temperature"
        }
      },
      cpu: {
        model: "GuardianMetaCPU",
        viewFunction: "guardianMetaCPU",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          cpu_percent: "percent_usage",
          cpu_clock: "clock_speed"
        }
      },
      datatransfer: {
        model: "GuardianMetaDataTransfer",
        viewFunction: "guardianMetaDataTransfer",
        timeStampColumn: "ended_at",
        dbToJsonMap: {
          started_at: "started_at",
          ended_at: "ended_at",
          bytes_received: "bytes_received",
          bytes_sent: "bytes_sent",
          total_bytes_received: "total_bytes_received",
          total_bytes_sent: "total_bytes_sent"
        }
      },
      lightmeter: {
        model: "GuardianMetaLightMeter",
        viewFunction: "guardianMetaLightMeter",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          luminosity: "luminosity"
        }
      },
      network: {
        model: "GuardianMetaNetwork",
        viewFunction: "guardianMetaNetwork",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          signal_strength: "signal_strength",
          network_type: "network_type",
          carrier_name: "carrier_name"
        }
      },
      offline: {
        model: "GuardianMetaOffline",
        viewFunction: "guardianMetaOffline",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          offline_duration: "offline_duration",
          carrier_name: "carrier_name"
        }
      },
      power: {
        model: "GuardianMetaPower",
        viewFunction: "guardianMetaPower",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          is_powered: "is_powered",
          is_charged: "is_charged"
        }
      },
      accelerometer: {
        model: "GuardianMetaAccelerometer",
        viewFunction: "guardianMetaAccelerometer",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at"
        }
      },
      diskusage: {
        model: "GuardianMetaDiskUsage",
        viewFunction: "guardianMetaDiskUsage",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at"
        }
      },
      messages: {
        model: "GuardianMetaMessage",
        viewFunction: "guardianMetaMessages",
        timeStampColumn: "received_at",
        dbToJsonMap: {
          guid: "guid",
          received_at: "received_at",
          sent_at: "sent_at",
          address: "address",
          body: "body"
        }
      },
      checkins: {
        model: "GuardianCheckIn",
        viewFunction: "guardianMetaCheckIns",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          queued_at: "queued_at",
          request_latency_guardian: "latency",
          guardian_queued_checkins: "queued"
        }
      },
      reboots: {
        model: "GuardianMetaReboot",
        viewFunction: "guardianMetaReboots",
        timeStampColumn: "completed_at",
        dbToJsonMap: {
          completed_at: "completed_at"
        }
      }
    };

    req.rfcx.limit = (req.query.limit == null) ? 1 : parseInt(req.query.limit);
    if (req.rfcx.limit > 5000) {
      req.rfcx.limit = 5000;
    } else if (req.rfcx.limit < 1) {
      req.rfcx.limit = 1;
    }

    models.Guardian
      .findOne({
        where: {guid: req.params.guardian_id}
      }).then(function (dbGuardian) {

        var dbQuery = {
          where: {guardian_id: dbGuardian.id},
          order: [[modelLookUp[meta_type].timeStampColumn, "DESC"]],
          //    limit: req.rfcx.limit,
          offset: req.rfcx.offset
        };

        // if we have datetime constraints, add them to the query
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn] = {};
        }
        if (req.rfcx.ending_before != null) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn]["$lt"] = req.rfcx.ending_before;
        }
        if (req.rfcx.starting_after != null) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn]["$gt"] = req.rfcx.starting_after;
        }

        // if we have no datetime constraints, make sure we impose the limit within the database query (rather than in the view function)
        if ((req.rfcx.ending_before == null) && (req.rfcx.starting_after == null)) {
          dbQuery.limit = req.rfcx.limit;
        }

        return models[modelLookUp[meta_type].model]
          .findAll(dbQuery)
          .then(function (dbMeta) {

            res.status(200).json(
              views.models[modelLookUp[meta_type].viewFunction](
                req, res,
                (req.rfcx.order == "DESC") ? dbMeta : dbMeta.reverse(),
                modelLookUp[meta_type]
              )
            );

            return null;

          }).catch(function (err) {
            console.log("failure to retrieve meta data: " + err);
            httpError(res, 500, "database");
          });

      }).catch(function (err) {
        console.log("failure to retrieve guardian: " + err);
        httpError(res, 404, "database");
      });
  })
;

router.route("/:guardian_id/meta2/:meta_type")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var meta_type = req.params.meta_type;

    var modelLookUp = {
      battery: {
        model: "GuardianMetaBattery",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          battery_percent: "percent_charged",
          battery_temperature: "temperature"
        }
      },
      cpu: {
        model: "GuardianMetaCPU",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          cpu_percent: "percent_usage",
          cpu_clock: "clock_speed"
        }
      },
      datatransfer: {
        model: "GuardianMetaDataTransfer",
        timeStampColumn: "ended_at",
        dbToJsonMap: {
          started_at: "started_at",
          ended_at: "ended_at",
          bytes_received: "bytes_received",
          bytes_sent: "bytes_sent",
          total_bytes_received: "total_bytes_received",
          total_bytes_sent: "total_bytes_sent"
        }
      },
      lightmeter: {
        model: "GuardianMetaLightMeter",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          luminosity: "luminosity"
        }
      },
      network: {
        model: "GuardianMetaNetwork",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          signal_strength: "signal_strength",
          network_type: "network_type",
          carrier_name: "carrier_name"
        }
      },
      offline: {
        model: "GuardianMetaOffline",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          offline_duration: "offline_duration",
          carrier_name: "carrier_name"
        }
      },
      power: {
        model: "GuardianMetaPower",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          is_powered: "is_powered",
          is_charged: "is_charged"
        }
      },
      messages: {
        model: "GuardianMetaMessage",
        timeStampColumn: "received_at",
        dbToJsonMap: {
          guid: "guid",
          received_at: "received_at",
          sent_at: "sent_at",
          address: "address",
          body: "body"
        }
      },
      checkins: {
        model: "GuardianCheckIn",
        timeStampColumn: "measured_at",
        dbToJsonMap: {
          measured_at: "measured_at",
          queued_at: "queued_at",
          request_latency_guardian: "latency",
          guardian_queued_checkins: "queued"
        }
      },
      reboots: {
        model: "GuardianMetaReboot",
        viewFunction: "guardianMetaReboots",
        timeStampColumn: "completed_at",
        dbToJsonMap: {
          completed_at: "completed_at"
        }
      }
    };

    req.rfcx.limit = (req.query.limit == null) ? 1 : parseInt(req.query.limit);
    if (req.rfcx.limit > 5000) {
      req.rfcx.limit = 5000;
    } else if (req.rfcx.limit < 1) {
      req.rfcx.limit = 1;
    }

    models.Guardian
      .findOne({
        where: {guid: req.params.guardian_id}
      }).then(function (dbGuardian) {

        var dbQuery = {
          where: {guardian_id: dbGuardian.id},
          order: [[modelLookUp[meta_type].timeStampColumn, "DESC"]],
          //    limit: req.rfcx.limit,
          offset: req.rfcx.offset
        };

        // if we have datetime constraints, add them to the query
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn] = {};
        }
        if (req.rfcx.ending_before != null) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn]["$lt"] = req.rfcx.ending_before;
        }
        if (req.rfcx.starting_after != null) {
          dbQuery.where[modelLookUp[meta_type].timeStampColumn]["$gt"] = req.rfcx.starting_after;
        }

        // if we have no datetime constraints, make sure we impose the limit within the database query (rather than in the view function)
        if ((req.rfcx.ending_before == null) && (req.rfcx.starting_after == null)) {
          dbQuery.limit = req.rfcx.limit;
        }

        models[modelLookUp[meta_type].model]
          .findAll(dbQuery)
          .then(function (dbMeta) {

            res.status(200).json(
              views.models.guardianMeta(
                req, res,
                (req.rfcx.order == "DESC") ? dbMeta : dbMeta.reverse(),
                modelLookUp[meta_type]
              )
            );

          }).catch(function (err) {
            console.log("failure to retrieve meta data: " + err);
            httpError(res, 500, "database");
          });

      }).catch(function (err) {
        console.log("failure to retrieve guardian: " + err);
        httpError(res, 404, "database");
      });
  })
;


module.exports = router;
