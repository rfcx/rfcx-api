var Promise = require("bluebird");
var fs = require("fs");
var exec = require("child_process").exec;
var audioUtils = require("../../utils/rfcx-audio").audioUtils;
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
//var analysisUtils = require("../../utils/rfcx-analysis/analysis-queue.js").analysisUtils;

//var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
//var SensationsService = require("../../services/sensations/sensations-service");

const moment = require("moment-timezone");

var loggers = require('../../utils/logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

exports.checkInAssets = {

  extractAudioFileMeta: function(checkInObj) {
    return new Promise(function(resolve, reject) {
      try {
        fs.stat(checkInObj.audio.filePath, function(statErr, fileStat) {
          if (!!statErr) { reject(statErr); }
          
          checkInObj.audio.meta = {
            size: fileStat.size,
            measuredAt: new Date(parseInt(checkInObj.audio.metaArr[1])),
            sha1CheckSum: checkInObj.audio.metaArr[3],
            sampleRate: parseInt(checkInObj.audio.metaArr[4]),
            bitRate: parseInt(checkInObj.audio.metaArr[5]),
            audioCodec: checkInObj.audio.metaArr[6],
            fileExtension: checkInObj.audio.metaArr[2],
            isVbr: (checkInObj.audio.metaArr[7].toLowerCase() === "vbr"),
            encodeDuration: parseInt(checkInObj.audio.metaArr[8]),
            mimeType: mimeTypeFromAudioCodec(checkInObj.audio.metaArr[6]),
            s3Path: assetUtils.getGuardianAssetStoragePath( "audio", new Date(parseInt(checkInObj.audio.metaArr[1])), checkInObj.json.guardian_guid, checkInObj.audio.metaArr[2])
          };

          audioUtils.transcodeToFile( "wav", {
              sourceFilePath: checkInObj.audio.filePath,
              sampleRate: checkInObj.audio.meta.sampleRate
            }).then(function(wavFilePath){
              fs.stat(wavFilePath, function(wavStatErr, wavFileStat) {
                if (wavStatErr !== null) { reject(wavStatErr); }

                exec(process.env.SOX_PATH+"i -s "+wavFilePath, function(err, stdout, stderr) {
                  if (stderr.trim().length > 0) { console.log(stderr); }
                  if (!!err) { console.log(err); }

                  checkInObj.audio.meta.captureSampleCount = parseInt(stdout.trim());
                  deleteFile(wavFilePath);
                  resolve(checkInObj);

                });

              });
            });

        });
      } catch(err) {
        logError('ExtractAudioFileMeta: common error', { err: err });
        reject();
      }
    }.bind(this));
  }

/*
  queueForTaggingByActiveModels: function(audioInfo) {

    return models.AudioAnalysisModel
      .findAll({
        where: { is_active: true }
      })
      .then(function(dbModels) {
        return dbModels.map(function(model) {
          return model.guid;
        });
      })
      .then(function(modelGuids) {
        var promises = [];
        for (i in modelGuids) {
          var prom = analysisUtils.queueAudioForAnalysis("rfcx-analysis", modelGuids[i], {
            audio_guid: audioInfo.audio_guid,
            api_url_domain: audioInfo.api_url_domain,
            audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
            audio_s3_path: audioInfo.s3Path,
            audio_sha1_checksum: audioInfo.sha1Hash,
          });
          promises.push(prom);
        }
        return Promise.all(promises);
      })
      .then(function() {
        audioInfo.isSaved.sqs = true;
        return audioInfo;
      });

  },
*/
/*
  rollBackCheckIn: function(audioInfo) {

    models.GuardianAudio.findOne({ where: { sha1_checksum: audioInfo.sha1Hash } }).then(function(dbAudio){ dbAudio.destroy().then(function(){ console.log("deleted incomplete audio entry"); }); }).catch(function(err){ console.log("failed to delete incomplete audio entry | "+err); });

    models.GuardianCheckIn.findOne({ where: { id: audioInfo.checkin_id } }).then(function(dbCheckIn){ dbCheckIn.destroy().then(function(){ console.log("deleted checkin entry"); }); }).catch(function(err){ console.log("failed to delete checkin entry | "+err); });

    cleanupCheckInFiles(audioInfo);
  },

  prepareWsObject: function(req, itemAudioInfo, dbGuardian, dbAudio) {
    let dbAudioObj = itemAudioInfo.dbAudioObj,
        timezone   = dbGuardian.Site.timezone;
    return {
      recordTime: {
        UTC: moment.tz(dbAudioObj.measured_at, timezone).toISOString(),
        localTime: moment.tz(dbAudioObj.measured_at, timezone).format(),
        timeZone: timezone
      },
      audioUrl: urls.getAudioAssetsUrl(req, dbAudioObj.guid, dbAudio.Format? dbAudio.Format.file_extension : 'mp3'),
      location: {
        latitude: dbGuardian.latitude,
        longitude: dbGuardian.longitude,
        site: dbAudio.Site.guid
      },
      length: {
        samples: dbAudioObj.capture_sample_count,
        timeInMs: dbAudio.Format?
          Math.round(1000 * dbAudioObj.capture_sample_count / dbAudio.Format.sample_rate) : null
      },
      format: {
        fileType: dbAudio.Format? dbAudio.Format.mime : null,
        sampleRate: dbAudio.Format? dbAudio.Format.sample_rate: null,
        bitDepth: itemAudioInfo.capture_bitrate
      },
      guardianGuid: dbGuardian.guid,
      audioGuid: dbAudio.guid,
    };
  }
*/


};



var deleteFile = function(filePath) {
    fs.stat( filePath, function(err, stat) {
      if (err == null) { fs.unlink( filePath, function(e) { if (e) { console.log(e); } } ); }
    });
};

var mimeTypeFromAudioCodec = function(audioCodec) {

  if (audioCodec.toLowerCase() == "opus") {
    return "audio/ogg";
  } else if (audioCodec.toLowerCase() == "flac") {
    return "audio/flac";
  } else if (audioCodec.toLowerCase() == "aac") {
    return "audio/mp4";
  } else if (audioCodec.toLowerCase() == "mp3") {
    return "audio/mpeg";
  } else {
    return null;
  }

};

