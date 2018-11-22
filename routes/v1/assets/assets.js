var verbose_logging = (process.env.NODE_ENV !== "production");
var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
const httpError = require("../../../utils/http-errors.js");
const Promise = require("bluebird");
const sequelize = require("sequelize");
const ValidationError = require("../../../utils/converter/validation-error");
const reportsService = require('../../../services/reports/reports-service');
const audioService = require('../../../services/audio/audio-service');

router.route("/audio/:audio_id")
  .get(function(req,res) {

    return models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function(dbAudio){

        if (!dbAudio) {
          return res.status(404).json({msg: "Audio with given guid not found."});
        }

        var audio_file_extensions = [ "m4a", "mp3", "flac", "opus"/*, "wav"*/ ];

        if (audio_file_extensions.indexOf(req.rfcx.content_type) >= 0) {

          views.models.guardianAudioFile(req,res,dbAudio);

        } else if (req.rfcx.content_type === "png") {

          views.models.guardianAudioSpectrogram(req,res,dbAudio);

        } else {

          views.models.guardianAudioJson(req,res,dbAudio)
            .then(function(audioJson){
              res.status(200).json(audioJson);
          });
        }

        return null;

      }).catch(function(err){
        console.log("failed to return audio | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio"}); }
      });

  });

router.route("/audio/amplitude/:audio_id")
  .get(function(req,res) {

    return models.GuardianAudio
      .findOne({
        where: { guid: req.params.audio_id },
        include: [{ all: true }]
      }).then(function(dbAudio){

        if (!dbAudio) {
          return res.status(404).json({msg: "Audio with given guid not found."});
        }

          views.models.guardianAudioAmplitude(req,res,dbAudio)
            .then(function(audioAmplitudeJson){
              res.status(200).json(audioAmplitudeJson);
          });

        return null;

      }).catch(function(err){
        console.log("failed to return audio amplitude | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return audio amplitude"}); }
      });

  });

router.route("/screenshots/:screenshot_id")
  .get(function(req,res) {

    return models.GuardianMetaScreenShot
      .findOne({
        where: { guid: req.params.screenshot_id },
        include: [{ all: true }]
      }).then(function(dbScreenshot){

        if (req.rfcx.content_type === "png") {
          views.models.guardianMetaScreenshotFile(req,res,dbScreenshot);
        } else {
          res.status(200).json(views.models.guardianMetaScreenshots(req,res,dbScreenshot));
        }

        return null;

      }).catch(function(err){
        console.log("failed to return screenshot | "+err);
        if (!!err) { res.status(500).json({msg:"failed to return screenshot"}); }
      });

  });

router.route("/report/audio/:guid").get(function(req, res) {

  return reportsService.getReportByGuid(req.params.guid)
    .then((dbReport) => {
      let filename = `${req.params.guid}.${req.rfcx.content_type}`;
      let s3Bucket = process.env.ASSET_BUCKET_REPORT;
      let s3Path = reportsService.getS3PathForReportAudio(dbReport.reported_at);
      return audioService.serveAudioFromS3(res, filename, s3Bucket, s3Path);
    })
    .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
    .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
    .catch(e => httpError(req, res, 500, e, e.message || `Could not find report audio.`));

});

module.exports = router;



