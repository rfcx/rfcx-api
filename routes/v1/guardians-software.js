var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../models");
var express = require("express");
var router = express.Router();
var fs = require("fs");
var util = require("util");
var querystring = require("querystring");
var passport = require("passport");
var hash = require("../../utils/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();
var guardianSoftware = require("../../data_storage/guardian-software.js");
var fileKeeper = require("../../file_storage/file-keeper.js");
var views = require("../../views/v1");
var passport = require("passport");
passport.use(require("../../middleware/passport-token").TokenStrategy);

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
      

        var dbQuery = { is_available: true };
        if (softwareRole === "all") {
          dbQuery.is_updatable = true;
        } else if (softwareRole === "extra") {
          dbQuery.is_extra = true;
        } else {
          dbQuery.role = softwareRole;
        }

        models.GuardianSoftware
          .findAll({
            where: dbQuery,
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

// get the latest released version of the guardian software
// (primarily for guardians who are checking for updates)
router.route("/:guardian_id/software/:software_role")
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
      

        var dbQuery = { is_available: true };
        if (softwareRole === "all") {
          dbQuery.is_updatable = true;
        } else if (softwareRole === "extra") {
          dbQuery.is_extra = true;
        } else {
          dbQuery.role = softwareRole;
        }

        models.GuardianSoftware
          .findAll({
            where: dbQuery,
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
