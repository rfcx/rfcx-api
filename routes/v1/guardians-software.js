var models  = require('../../models');
var express = require('express');
var router = express.Router();
var hash = require("../../misc/hash.js").hash;
var aws = require("../../config/aws.js").aws();

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route("/:guardian_id/software/latest")
  .get(function(req,res) {

    models.Guardian
      .findOrCreate({ where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian, wasCreated){
      
        models.GuardianSoftware
          .findAll({ where: { is_available: true }, order: "release_date DESC", limit: 2 })
          .then(function(dSoftware){
            console.log("software version check by guardian '"+dbGuardian.guid+"'");
            var softwareJson = [];
            for (i in dSoftware) {
              softwareJson[i] = {
                versionNumber: dSoftware[i].number,
                releaseDate: dSoftware[i].release_date.toISOString(),
                sha1: dSoftware[i].sha1_checksum,
                url: dSoftware[i].url
              };
            }
            res.status(200).json(softwareJson);
          }).catch(function(err){
            res.status(500).json({msg:"error finding latest software version"});
          });

      });
  })
;

// submit a new APK guardian software file
// (primarily for admin use, when releasing a new software version)
router.route("/-/software")
  .post(function(req,res) {

    // models.GuardianSoftware
    //   .findAll({ where: { is_available: true }, order: "number DESC", limit: 1 })
    //   .then(function(dSoftware){
    //     res.status(200).json({
    //       versionNumber: dSoftware[0].number,
    //       releaseDate: dSoftware[0].release_date.toISOString(),
    //       sha1: dSoftware[0].sha1_checksum,
    //       url: dSoftware[0].url
    //     });
    //   }).catch(function(err){
    //     res.status(500).json({msg:"error"});
    //   });
  })
;

module.exports = router;
