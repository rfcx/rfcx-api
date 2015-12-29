var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var views = require("../../views/v1");
var guardianStatus = require("../../utils/rfcx-query");
var httpError = require("../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

router.route("/:guardian_id/status")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

        models.Guardian
          .findOne({ 
            where: { guid: req.params.guardian_id }
        }).then(function(dbGuardian){

            guardianStatus.guardianAudioStatus.coverage(dbGuardian.id, 3).then(function(coverage_3hours){
                guardianStatus.guardianAudioStatus.coverage(dbGuardian.id, 6).then(function(coverage_6hours){
                    guardianStatus.guardianAudioStatus.coverage(dbGuardian.id, 12).then(function(coverage_12hours){
                        guardianStatus.guardianAudioStatus.coverage(dbGuardian.id, 24).then(function(coverage_24hours){


                            guardianStatus.guardianMetaStatus.dataTransfer(dbGuardian.id, 24).then(function(data_24hours){

                                res.status(200).json({
                                    audio: {
                                        coverage: {
                                            "3hrs": coverage_3hours,
                                            "6hrs": coverage_6hours,
                                            "12hrs": coverage_12hours,
                                            "24hrs": coverage_24hours
                                        }
                                    },
                                    data_transfer: {
                                        "24hrs": data_24hours
                                    }
                                });
                            });

                        });
                    });
                });
            });


        }).catch(function(err){
            console.log("failure to retrieve guardian: "+err);
            httpError(res, 404, "database");
        });
  })
;


module.exports = router;
