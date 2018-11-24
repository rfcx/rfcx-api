var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var util = require("util");
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var assetUtils = require("../../../utils/internal-rfcx/asset-utils.js").assetUtils;
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);

var analysisUtils = require("../../../utils/rfcx-analysis/analysis-queue.js").analysisUtils;

function processAudios(req, res, dbAudio, dbGuardian, audioGuids, modelGuid) {
  if (dbAudio.length < 1) {
    httpError(req, res, 404, null, 'No audios found');
    return Promise.reject();
  } else {
    if (!util.isArray(dbAudio)) { dbAudio = [dbAudio]; }
    var batch = [];
    for (i in dbAudio) {
      batch.push({
        audio_guid: dbAudio[i].guid,
        api_url_domain: req.rfcx.api_url_domain,
        audio_sha1_checksum: dbAudio[i].sha1_checksum,
        audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
        audio_s3_path:
          // auto-generate the asset filepath if it's not stored in the url column
          (dbAudio[i].url == null)
            ? assetUtils.getGuardianAssetStoragePath("audio", dbAudio[i].measured_at, dbGuardian.guid, dbAudio[i].Format.file_extension)
            : dbAudio[i].url.substr(dbAudio[i].url.indexOf("://")+3+process.env.ASSET_BUCKET_AUDIO.length),
      });
      audioGuids.push(dbAudio[i].guid);
    }
    return analysisUtils.batchQueueAudioForAnalysis(process.env.SQS_PERCEPTION_BATCH, modelGuid, batch);
  }
}

router.route("/:guardian_id/audio/analysis")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    models.Guardian
      .findOne({
        where: { guid: req.params.guardian_id }
      })
      .then(function(dbGuardian) {

        var dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : "DESC";

        var dbQuery = { guardian_id: dbGuardian.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gte"] = req.rfcx.starting_after; }

        var createdClmn = "created_at";
        if ((req.query.created_before != null) || (req.query.created_after != null)) {
          dbQuery[createdClmn] = {};
        }
        if (req.query.created_before != null) {
            dbQuery[createdClmn]["$lt"] = req.query.created_before ;
        }
        if (req.query.created_after != null) {
          dbQuery[createdClmn]["$gte"] = req.query.created_after;
        }

        if (req.query.manual_upload){
          dbQuery.check_in_id = null
        }

        var modelGuid = req.query.model_id;
        var siteGuids = [];
        var guardianGuids = [ dbGuardian.guid ];
        var audioGuids = [];

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            include: [ { all: true } ],
            order: [ [dateClmn, dbQueryOrder] ],
            limit: 150000,//req.rfcx.limit,
            offset: req.rfcx.offset
          })
          .then(function(dbAudio){
            return processAudios(req, res, dbAudio, audioGuids);
          })
          .then(function () {
            res.status(200).json({
              site_guids: siteGuids,
              guardian_guids: guardianGuids,
              model_id: modelGuid,
              starting_after: req.rfcx.starting_after,
              ending_before: req.rfcx.ending_before,
              queued_audio_files: audioGuids.length
            });
          })
          .catch(function(err){
            console.log("failed to requeue audio | "+err);
            if (!!err) { res.status(500).json({msg:"failed to requeue audio"}); }
          });

      })
      .catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;

router.route("/sites/:site_id/audio/analysis")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    models.GuardianSite
      .findOne({
        where: { guid: req.params.site_id }
      })
      .then(function(dbSite) {

        var dbQueryOrder = (req.rfcx.order != null) ? req.rfcx.order : "DESC";

        var dbQuery = { site_id: dbSite.id };
        var dateClmn = "measured_at";
        if ((req.rfcx.ending_before != null) || (req.rfcx.starting_after != null)) { dbQuery[dateClmn] = {}; }
        if (req.rfcx.ending_before != null) { dbQuery[dateClmn]["$lt"] = req.rfcx.ending_before; }
        if (req.rfcx.starting_after != null) { dbQuery[dateClmn]["$gte"] = req.rfcx.starting_after; }

        var createdClmn = "created_at";
        if ((req.query.created_before != null) || (req.query.created_after != null)) {
          dbQuery[createdClmn] = {};
        }
        if (req.query.created_before != null) {
            dbQuery[createdClmn]["$lt"] = req.query.created_before ;
        }
        if (req.query.created_after != null) {
          dbQuery[createdClmn]["$gte"] = req.query.created_after;
        }

        if (req.query.manual_upload){
          dbQuery.check_in_id = null
        }

        var modelGuid = req.query.model_id;
        var siteGuids = [ req.params.site_id ];
        var guardianGuids = [];
        var audioGuids = [];

        return models.GuardianAudio
          .findAll({
            where: dbQuery,
            include: [ { all: true } ],
            order: [ [dateClmn, dbQueryOrder] ],
            limit: 150000,//req.rfcx.limit,
            offset: req.rfcx.offset
          })
          .then(function(dbAudio){
            return processAudios(req, res, dbAudio, dbGuardian, audioGuids, modelGuid);
          })
          .then(function () {
            res.status(200).json({
              site_guids: siteGuids,
              guardian_guids: guardianGuids,
              model_id: modelGuid,
              starting_after: req.rfcx.starting_after,
              ending_before: req.rfcx.ending_before,
              queued_audio_files: audioGuids.length
            });
          })
          .catch(function(err){
            console.log("failed to requeue audio | ", err);
            if (!!err) { res.status(500).json({msg:"failed to requeue audio"}); }
          });

      })
      .catch(function(err){
        console.log("failed to find guardian | "+err);
        if (!!err) { res.status(500).json({msg:"failed to find guardian"}); }
      });

  })
;

router.route("/audio/analysis")
  .post(passport.authenticate("token",{session:false}), function(req,res) {

    var audioGuids = [];
    return models.GuardianAudio
      .findAll({
        where: { guid: { $in: req.body.guids } },
        include: [ { all: true } ],
        limit: 140000,
      })
      .then(function(dbAudio){
        return processAudios(req, res, dbAudio, audioGuids);
      })
      .then(function () {
        res.status(200).json(audioGuids);
      })
      .catch(function(err){
        console.log("failed to requeue audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to requeue audio"}); }
      });

  });


module.exports = router;



