var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/meta/:meta_type")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

        var meta_type = req.params.meta_type;

        var modelLookUp = {
            battery: ["GuardianMetaBattery", "guardianMetaBattery", "measured_at"],
            cpu: ["GuardianMetaCPU", "guardianMetaCPU", "measured_at"],
            datatransfer: ["GuardianMetaDataTransfer", "guardianMetaDataTransfer", "ended_at"],
            lightmeter: ["GuardianMetaLightMeter", "guardianMetaLightMeter", "measured_at"],
            network: ["GuardianMetaNetwork", "guardianMetaNetwork", "measured_at"],
            offline: ["GuardianMetaOffline", "guardianMetaOffline", "ended_at"],
            power: ["GuardianMetaPower", "guardianMetaPower", "measured_at"],
            messages: ["GuardianMetaMessage", "guardianMetaMessages", "received_at"]
        };

        models.Guardian
          .findOne({ 
            where: { guid: req.params.guardian_id }
        }).then(function(dbGuardian){

            var dbQuery = { guardian_id: dbGuardian.id };
            var dateClmn = modelLookUp[meta_type][2];
            if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
            if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
            if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gt"] = req.rfcx.starting_after; }

            models[modelLookUp[meta_type][0]]
                .findAll({
                    where: dbQuery,
                    order: [ [dateClmn, "DESC"] ],
                    limit: req.rfcx.limit,
                    offset: req.rfcx.offset
                }).then(function(dbMeta){

                    res.status(200).json(views.models[modelLookUp[meta_type][1]](req,res,dbMeta));

                }).catch(function(err){
                    res.status(500).json({msg:"error finding guardian | "+err});
                });

        }).catch(function(err){
            res.status(500).json({msg:"error finding guardian | "+err});
        });
  })
;


module.exports = router;
