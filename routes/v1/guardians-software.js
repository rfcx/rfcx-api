var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require("querystring");
var passport = require("passport");
var hash = require("../../misc/hash.js").hash;
var aws = require("../../misc/aws.js").aws();
var guardianSoftware = require("../../data_storage/guardian-software.js");
var fileKeeper = require("../../file_storage/file-keeper.js");
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/auth/passport-token.js").TokenStrategy);

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route("/:guardian_id/software/:software_role/latest")
  .get(passport.authenticate("token",{session:false}), function(req,res) {

    var softwareRole = req.params.software_role;
    var inquiringSoftwareRole = req.query.role;
    var inquiringSoftwareVersion = req.query.version;

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        dbGuardian.last_update_check_in = new Date();
        dbGuardian.update_check_in_count = 1+dbGuardian.update_check_in_count;
        dbGuardian.save();

        models.GuardianSoftware
          .findOne({
            where: { 
              role: req.query.role
            }
          }).then(function(dbSoftware){
            models.GuardianSoftwareVersion
              .findOne({
                where: { 
                  software_role_id: dbSoftware.id, 
                  version: req.query.version
                }
              }).then(function(dbSoftwareVersion){
                models.GuardianMetaUpdateCheckIn
                  .create({
                    guardian_id: dbGuardian.id,
                    version_id: dbSoftwareVersion.id
                  }).then(function(dbGuardianMetaUpdateCheckIn){ }).catch(function(err){ });
              }).catch(function(err){ });
          }).catch(function(err){ });
      

        var dbSearchFilter = { is_available: true };
        if (softwareRole === "all") {
          dbSearchFilter.is_updatable = true;
        }  else {
          dbSearchFilter.role = softwareRole;
        }

        models.GuardianSoftware
          .findAll({
            where: dbSearchFilter,
            include: [ { all: true } ], 
            order: [ ["current_version_id", "ASC"] ]
          }).then(function(dSoftware){

            res.status(200).json(views.models.guardianSoftware(req,res,dSoftware));

          }).catch(function(err){
            res.status(500).json({msg:"error finding latest software versions | "+err});
          });

      });
  })
;

// legacy endpoint for logging update requests from stranded guardians
router.route("/:guardian_id/software/latest")
  .get(function(req,res) {

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      }).then(function(dbGuardian){

        dbGuardian.last_update_check_in = new Date();
        dbGuardian.update_check_in_count = 1+dbGuardian.update_check_in_count;
        dbGuardian.save();

        models.GuardianMetaUpdateCheckIn.create({
            guardian_id: dbGuardian.id,
            version_id: dbGuardian.version_id
          }).then(function(dbGuardianMetaUpdateCheckIn){
            
            res.status(200).json({
              versionNumber: "0.5.0",
              releaseDate: (new Date()),
              sha1: "x",
              url: "x"
            });

          }).catch(function(err){
            res.status(500).json({msg:"error finding latest software version | "+err});
          });
      });
})
;

router.route("/upload/software")
  .get(function(req,res) {
})
;

// submit a new APK guardian software file
// (primarily for admin use, when releasing a new software version)
router.route("/upload/software")
  .post(function(req,res) {
  	if(!req.body.software_version){
  	  res.status(500).json({msg:"a software version must be specified"});
  	  return;
  	}
  	hash.fileSha1Async(req.files.software ? req.files.software.path : null)
  	.then(function(fileHash){
      return guardianSoftware.upsertGuardianSoftware(req.body.software_version, fileHash)
    })
    .then(function(gs) {
      //if a file was uploaded
      if(req.files.software && req.files.software.path) {
  		  fileKeeper.putFile(req.files.software.path, "rfcx-development", req.body.software_version+".apk")
  		  .then(function(fkRes){
      	  //remove temporarily uploaded file
      	  fs.unlink(req.files.software.path,function(e){if(e){console.log(e);}});
      	  if (200 == fkRes.statusCode) {
      	    res.status(200).json({msg:"success"}); 
      	  } else {
      	    res.status(500).json({msg:"file keeper error storing guardian software file: " + fkRes.msg});
      	  }
      	})
      	.done()
    	} else {
    	  res.status(200).json({msg:"success"});
    	}
  	}).catch(function(err){
      res.status(500).json({msg:"error submitting guardian software file: " + err.message});
    });
  })
;   

module.exports = router;
