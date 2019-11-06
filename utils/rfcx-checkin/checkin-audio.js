var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");
var fs = require("fs");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;
var token = require("../../utils/internal-rfcx/token.js").token;
var aws = require("../../utils/external/aws.js").aws();
var exec = require("child_process").exec;
var audioUtils = require("../../utils/rfcx-audio").audioUtils;
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
var analysisUtils = require("../../utils/rfcx-analysis/analysis-queue.js").analysisUtils;

var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var SensationsService = require("../../services/sensations/sensations-service");
const analysisService = require('../../services/analysis/analysis-service');
const aiService = require('../../services/ai/ai-service');

const moment = require("moment-timezone");
var urls = require('../../utils/misc/urls');

var loggers = require('../../utils/logger');
var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

exports.audio = {

  info: function(audioFiles, apiUrlDomain, audioMeta, dbGuardian, dbCheckIn) {

    // REMOVE LATER
    // cached file garbage collection...
    if (Math.random() < 0.01 ? true : false) { // only do garbage collection ~1% of the time it's allowed
      cachedFiles.cacheDirectoryGarbageCollection();
    }

    var audioInfo = {};

    if (!!audioFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(audioFiles)) { audioFiles = [audioFiles]; }

      if (audioMeta.length == audioFiles.length) {

        for (i in audioFiles) {

          var timeStamp = audioMeta[i][1];
          var timeStampDateObj = new Date(parseInt(timeStamp));

          audioInfo[timeStamp] = {

            guardian_id: dbGuardian.id,
            guardian_guid: dbGuardian.guid,
            checkin_id: dbCheckIn.id,
            checkin_guid: dbCheckIn.guid,
            site_id: dbGuardian.site_id,

            originalFilename: audioFiles[i].originalname,
            uploadLocalPath: audioFiles[i].path,
            unzipLocalPath: audioFiles[i].path.substr(0,audioFiles[i].path.lastIndexOf("."))+"."+audioMeta[i][2],
            wavAudioLocalPath: audioFiles[i].path.substr(0,audioFiles[i].path.lastIndexOf("."))+".wav",

            guardianSha1Hash: audioMeta[i][3],
            sha1Hash: null, // to be calculated following the uncompression
            size: null, // to be calculated following the uncompression

            dbAudioObj: null,
            audio_id: null,
            audio_guid: null,

            capture_format: null,
            capture_bitrate: (audioMeta[i][5] != null) ? parseInt(audioMeta[i][5]) : null,
            capture_sample_rate: (audioMeta[i][4] != null) ? parseInt(audioMeta[i][4]) : null,
            capture_sample_count: null,
            capture_encode_duration: (audioMeta[i][8] != null) ? parseInt(audioMeta[i][8]) : null,
            capture_file_extension: audioMeta[i][2],
            capture_codec: audioMeta[i][6],
            capture_is_vbr: (audioMeta[i][7].toLowerCase() === "vbr"),

            timeStamp: timeStamp,
            measured_at: timeStampDateObj,
            api_token_guid: null,
            api_token: null,
            api_token_expires_at: null,
            api_url: null,
            api_url_domain: apiUrlDomain,
            isSaved: { db: false, s3: false, sqs: false },
            s3Path: assetUtils.getGuardianAssetStoragePath("audio",timeStampDateObj,dbGuardian.guid,audioMeta[i][2])
          };

        }

      } else {
        console.log("couldn't match audio meta to uploaded content | "+audioMeta);
      }

    }
    return audioInfo;
  },

  processUpload: function(audioInfo) {
    return new Promise(function(resolve, reject) {
        try {
          // unzip uploaded audio file into upload directory
          audioInfo.unZipStream = fs.createWriteStream(audioInfo.unzipLocalPath);
          fs.createReadStream(audioInfo.uploadLocalPath)
            .pipe(zlib.createGunzip())
            .pipe(audioInfo.unZipStream);
          // when the output stream closes, proceed asynchronously...
          audioInfo.unZipStream.on("close", function(){
            // calculate checksum of unzipped file
            audioInfo.sha1Hash = hash.fileSha1(audioInfo.unzipLocalPath);
            // compare to checksum received from guardian
            if (audioInfo.sha1Hash === audioInfo.guardianSha1Hash) {
              resolve(audioInfo);
            } else {
              console.log("checksum mismatch on uploaded (and unzipped) audio file | "+audioInfo.sha1Hash + " - " + audioInfo.guardianSha1Hash);
              reject(new Error());
            }

          });

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  },

  extractAudioFileMeta: function(audioInfo) {
    return new Promise(function(resolve, reject) {
      try {
        fs.stat(audioInfo.unzipLocalPath, function(statErr, fileStat) {
          if (!!statErr) { reject(statErr); }
          audioInfo.size = fileStat.size;
          audioInfo.dbAudioObj.size = audioInfo.size;
          audioInfo.dbAudioObj.save()
            .then(() => {
              return audioUtils.transcodeToFile( "wav", {
                sourceFilePath: audioInfo.unzipLocalPath,
                sampleRate: audioInfo.capture_sample_rate
              });
            })
            .then(function(wavFilePath) {
              fs.stat(wavFilePath, function(wavStatErr, wavFileStat) {
                if (wavStatErr !== null) { reject(wavStatErr); }
                audioInfo.wavAudioLocalPath = wavFilePath;
                exec(process.env.SOX_PATH+"i -s "+audioInfo.wavAudioLocalPath, function(err, stdout, stderr) {
                  if (stderr.trim().length > 0) { console.log(stderr); }
                  if (!!err) { console.log(err); }

                  audioInfo.dbAudioObj.capture_sample_count = parseInt(stdout.trim());

                  audioInfo.dbAudioObj.save()
                    .then(() => {
                      return SensationsService.createSensationsFromGuardianAudio(audioInfo.dbAudioObj.guid)
                    })
                    .then(() => {
                      resolve();
                    })
                    .catch((err) => {
                      logError('ExtractAudioFileMeta: createSensationsFromGuardianAudio error', { err: err });
                      resolve();
                    });
                  cleanupCheckInFiles(audioInfo);
                });
              });
            })
            .catch(function(err){
              logError('ExtractAudioFileMeta: audioInfo error', { err: err });
              cleanupCheckInFiles(audioInfo);
              reject();
            });
        });
      } catch(err) {
        logError('ExtractAudioFileMeta: common error', { err: err });
        cleanupCheckInFiles(audioInfo);
        reject();
      }
    })
  },

  saveToDb: function(audioInfo) {

    let dbAudioLocal;

    return models.GuardianAudio
      .findOrCreate({
        where: {
          sha1_checksum: audioInfo.sha1Hash
        },
        defaults: {
          guardian_id: audioInfo.guardian_id,
          site_id: audioInfo.site_id,
          check_in_id: audioInfo.checkin_id,
          sha1_checksum: audioInfo.sha1Hash,
          url: null,//"s3://"+process.env.ASSET_BUCKET_AUDIO+audioInfo.s3Path,
          original_filename: audioInfo.originalFilename,
          capture_bitrate: audioInfo.capture_bitrate,
          encode_duration: audioInfo.capture_encode_duration,
          measured_at: audioInfo.measured_at,
          measured_at_local: moment.tz(audioInfo.measured_at, (audioInfo.timezone || 'UTC')).format('YYYY-MM-DDTHH:mm:ss.SSS'),
        }
      })
      .spread(function(dbAudio, wasCreated){
        dbAudioLocal = dbAudio;
        return models.GuardianAudioFormat
          .findOrCreate({
            where: {
              codec: audioInfo.capture_codec,
              mime: mimeTypeFromAudioCodec(audioInfo.capture_codec),
              file_extension: audioInfo.capture_file_extension,
              sample_rate: audioInfo.capture_sample_rate,
              target_bit_rate: audioInfo.capture_bitrate,
              is_vbr: audioInfo.capture_is_vbr
            }
          })
      })
      .spread(function(dbAudioFormat, wasCreated){
        dbAudioLocal.format_id = dbAudioFormat.id;
        return dbAudioLocal.save();
      })
      .then(function(dbAudio) {
        return dbAudio.reload({include: [{ all: true } ]});
      })
      .then(function(dbAudio) {
        audioInfo.isSaved.db = true;
        audioInfo.dbAudioObj = dbAudio;
        audioInfo.audio_id = dbAudio.id;
        audioInfo.audio_guid = dbAudio.guid;
        return audioInfo;
      });

  },

  saveToS3: function(audioInfo) {
    return new Promise(function(resolve, reject) {

      aws.s3(process.env.ASSET_BUCKET_AUDIO)
        .putFile(
          audioInfo.unzipLocalPath,
          audioInfo.s3Path,
          function(err, s3Res){
            try { s3Res.resume(); } catch (resumeErr) { console.log(resumeErr); }
            if (!!err) {
              console.log(err);
              reject(new Error(err));
            } else if ((200 == s3Res.statusCode) && aws.s3ConfirmSave(s3Res,audioInfo.s3Path)) {

              audioInfo.isSaved.s3 = true;

              resolve(audioInfo);

            } else {
              reject(new Error("audio file could not be successfully saved"));
            }
      });

    }.bind(this));
  },

  queueForTaggingByActiveModels: function(audioInfo) {

    return models.AudioAnalysisModel
      .findAll({
        where: { is_active: true }
      })
      .bind({})
      .then(function(dbModels) {
        logDebug('queueForTaggingByActiveModels: models', { length: dbModels.length });
        this.dbModels = dbModels;
        return dbModels.map(function(model) {
          return model.guid;
        });
      })
      .then(function(modelGuids) {
        logDebug('queueForTaggingByActiveModels: models guids', { guids: modelGuids });
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
        logDebug('queueForTaggingByActiveModels: after queueAudioForAnalysis');
        analysisService.findStateByName('perc_queued')
          .then((state) => {
            logDebug('queueForTaggingByActiveModels: state', { state: state.id });
            let proms = this.dbModels.map((model) => {
              return analysisService.createEntity(audioInfo.audio_id, model.id, state.id);
            });
            return Promise.all(proms);
          })
          .catch((err) => {
            logError('queueForTaggingByActiveModels: analysis entries error', { error: err });
          });

        audioInfo.isSaved? audioInfo.isSaved.sqs = true : audioInfo.isSaved = { sqs: true };
        logDebug('queueForTaggingByActiveModels: audioInfo', { audioInfo });
        return audioInfo;
      });

  },

  queueForTaggingByActiveV3Models: function(audioInfo, dbGuardian) {

    return aiService.getPublicAis({ isActive: true })
      .then((ais) => {
        logDebug('queueForTaggingByActiveV3Models', { audioInfo, dbGuardian, ais });
        // stay only those AIs which have this guardian in guardianWhitelist
        return ais.filter((ai) => {
          return ai.guardiansWhitelist && ai.guardiansWhitelist.length && ai.guardiansWhitelist.includes(dbGuardian.guid);
        });
      })
      .then((ais) => {
        let promises = [];
        ais.forEach((ai) => {
          const name = aiService.combineTopicQueueNameForGuid(ai.guid);
          let prom = aws.publish(name, {
            guid: audioInfo.audio_guid,
            guardian_guid: dbGuardian.guid,
            guardian_shortname: dbGuardian.shortname,
            site_guid: dbGuardian.Site.guid,
            site_timezone: dbGuardian.Site.timezone,
            measured_at: audioInfo.dbAudioObj.measured_at,
            file_extension: audioInfo.dbAudioObj.Format.file_extension,
            capture_sample_count: audioInfo.dbAudioObj.capture_sample_count,
            sample_rate: audioInfo.dbAudioObj.Format.sample_rate,
            latitude: dbGuardian.latitude,
            longitude: dbGuardian.longitude,
          })
          promises.push(prom);
        })
        return Promise.all(promises);
      })

  },


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
  },

  prepareKafkaObject: (req, itemAudioInfo, dbGuardian, dbAudio) => {
    let dbAudioObj = itemAudioInfo.dbAudioObj,
        timezone   = dbGuardian.Site.timezone;
    return {
      fileType: dbAudio.Format? dbAudio.Format.mime : null,
      sampleRate: dbAudio.Format? dbAudio.Format.sample_rate: null,
      bitDepth: itemAudioInfo.capture_bitrate,
      timeInMs: dbAudio.Format? Math.round(1000 * dbAudioObj.capture_sample_count / dbAudio.Format.sample_rate) : null,
      samples: dbAudioObj.capture_sample_count,
      utc: moment.tz(dbAudioObj.measured_at, timezone).toISOString(),
      localTime: moment.tz(dbAudioObj.measured_at, timezone).format(),
      timeZone: timezone,
      audioUrl: urls.getAudioAssetsUrl(req, dbAudioObj.guid, dbAudio.Format? dbAudio.Format.file_extension : 'mp3'),
      lat: dbGuardian.latitude,
      long: dbGuardian.longitude,
      guardianGuid: dbGuardian.guid,
      audioGuid: dbAudio.guid,
      site: dbAudio.Site.name,
      spectrogramUrl: urls.getSpectrogramAssetsUrl(req, dbAudio.guid),
      s3bucket: process.env.ASSET_BUCKET_AUDIO,
      s3path: itemAudioInfo.s3Path,
    };
  },

};



var cleanupCheckInFiles = function(audioInfo) {

    fs.stat( audioInfo.uploadLocalPath, function(err, stat) {
      if (err == null) { fs.unlink( audioInfo.uploadLocalPath, function(e) { if (e) { console.log(e); } } ); }
    });

    fs.stat( audioInfo.unzipLocalPath, function(err, stat) {
      if (err == null) { fs.unlink( audioInfo.unzipLocalPath, function(e) { if (e) { console.log(e); } } ); }
    });

    fs.stat( audioInfo.wavAudioLocalPath, function(err, stat) {
      if (err == null) { fs.unlink( audioInfo.wavAudioLocalPath, function(e) { if (e) { console.log(e); } } ); }
    });

};

var mimeTypeFromAudioCodec = function(audioCodec) {

  if (audioCodec.toLowerCase() == "aac") {
    return "audio/mp4";
  } else if (audioCodec.toLowerCase() == "opus") {
    return "audio/ogg";
  } else if (audioCodec.toLowerCase() == "flac") {
    return "audio/flac";
  } else if (audioCodec.toLowerCase() == "mp3") {
    return "audio/mpeg";
  } else {
    return null;
  }

};

