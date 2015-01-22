var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require('../../models');
var express = require('express');
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require("querystring");
var hash = require("../../misc/hash.js").hash;
var aws = require("../../config/aws.js").aws();

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route("/:guardian_id/software/latest")
  .get(function(req,res) {

    models.Guardian
      .findOrCreate({ where: { guid: req.params.guardian_id } })
      .spread(function(dbGuardian, wasCreated){
        dbGuardian.last_update_check_in = new Date();
        dbGuardian.update_check_in_count = 1+dbGuardian.update_check_in_count;
        dbGuardian.save();

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
                url: 
                  (process.env.NODE_ENV !== "development") ? dSoftware[i].url : "http://192.168.0.62:8080/apk/"+dSoftware[i].number+".apk"
                
              };
            }
            res.status(200).json(softwareJson);
          }).catch(function(err){
            res.status(500).json({msg:"error finding latest software version"});
          });

      });
  })
;

router.route("/software")
  .get(function(req,res) {
  })
;

// submit a new APK guardian software file
// (primarily for admin use, when releasing a new software version)
router.route("/software")
  .post(function(req,res) {

  if (req.files.software) {


    res.status(200).json({});

    // models.GuardianSoftware
    //   .findOrCreate({ where: { number: req.params.software_version } })
    //   .spread(function(dbSoftware, wasCreated){

    //     console.log("matched to version: "+dbSoftware.software_version);

    //     if (!!req.files.software) {

    //       dbSoftware.release_date = new Date();
    //       dbSoftware.is_available = true;
    //       dbSoftware.sha1_checksum = hash.fileSha1(req.files.software.path);
    //       dbSoftware.url = "https://static.rfcx.org/dl/guardian-android/"+dbSoftware.software_version+".apk";
    //       dbSoftware.save();


    //       // aws.s3("rfcx-ark").putFile(
    //       //   req.files.software.path, "/dl/guardian-android/"+"0.4.19"+".apk", 
    //       //   function(err, s3Res){
    //       //     s3Res.resume();
    //       //     if (!!err) {
    //       //       console.log(err);
    //       //     } else if (200 == s3Res.statusCode) {

    //       //       console.log("asdfasdfasdf");
    //       //       res.status(200).json({msg:"success"});

    //       //       fs.unlink(req.files.software.path,function(e){if(e){console.log(e);}});
    //       //     }
    //       // });





    //   }).catch(function(err){
    //     res.status(500).json({msg:"error"});
    //   });
    
    }

    res.status(200).json({msg:"no file"});

  })
;



module.exports = router;
