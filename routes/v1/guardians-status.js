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

            guardianStatus.guardianAudioStatus.allCoverage(dbGuardian.id, 3).then(function(coverageResult){

                guardianStatus.guardianMetaStatus.allTotalDataTransfer(dbGuardian.id, 3).then(function(dataTransferResult){

                    res.status(200).json({
                        audio: {
                            coverage_percent: coverageResult
                        },
                        data_transfer: dataTransferResult
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
