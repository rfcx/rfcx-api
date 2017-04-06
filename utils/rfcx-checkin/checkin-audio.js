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
          fs.createReadStream(audioInfo.uploadLocalPath).pipe(zlib.createGunzip()).pipe(audioInfo.unZipStream);
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
      try {
        fs.stat(audioInfo.unzipLocalPath, function(statErr,fileStat){
          if (statErr == null) {

            audioInfo.size = fileStat.size;
            audioInfo.dbAudioObj.size = audioInfo.size;
            audioInfo.dbAudioObj.save();

            audioUtils.transcodeToFile( "wav", {
                sourceFilePath: audioInfo.unzipLocalPath,
                sampleRate: audioInfo.capture_sample_rate
            }).then(function(wavFilePath){

              fs.stat(wavFilePath, function(wavStatErr,wavFileStat){
                if (wavStatErr == null) {
                  audioInfo.wavAudioLocalPath = wavFilePath;
                  exec(process.env.SOX_PATH+"i -s "+audioInfo.wavAudioLocalPath, function(err,stdout,stderr){
                    if (stderr.trim().length > 0) { console.log(stderr); }
                    if (!!err) { console.log(err); }

                    audioInfo.dbAudioObj.capture_sample_count = parseInt(stdout.trim());
                    audioInfo.dbAudioObj.save().then(() => {
                      return SensationsService.createSensationsFromGuardianAudio(audioInfo.dbAudioObj.guid)
                        .catch(err => {
                          if (!!err) { console.log("could not create sensations for audio guid "+audioInfo.dbAudioObj.guid); }
                        })
                    });

                    cleanupCheckInFiles(audioInfo);

                  });
                }
              });
            }).catch(function(err){
              console.log(err);
              cleanupCheckInFiles(audioInfo);
            });
          }
        });
      } catch(err) {
          console.log(err);
          cleanupCheckInFiles(audioInfo);
      }
  },

  saveToDb: function(audioInfo) {
    return new Promise(function(resolve, reject) {

      models.GuardianAudio.create({
        guardian_id: audioInfo.guardian_id,
        site_id: audioInfo.site_id,
        check_in_id: audioInfo.checkin_id,
        sha1_checksum: audioInfo.sha1Hash,
        url: null,//"s3://"+process.env.ASSET_BUCKET_AUDIO+audioInfo.s3Path,
        capture_bitrate: audioInfo.capture_bitrate,
        encode_duration: audioInfo.capture_encode_duration,
        measured_at: audioInfo.measured_at
      }).then(function(dbAudio){

        models.GuardianAudioFormat
          .findOrCreate({
            where: {
              codec: audioInfo.capture_codec,
              mime: mimeTypeFromAudioCodec(audioInfo.capture_codec),
              file_extension: audioInfo.capture_file_extension,
              sample_rate: audioInfo.capture_sample_rate,
              target_bit_rate: audioInfo.capture_bitrate,
              is_vbr: audioInfo.capture_is_vbr
            }
          }).spread(function(dbAudioFormat, wasCreated){
            
            dbAudio.format_id = dbAudioFormat.id;
            dbAudio.save();

            audioInfo.isSaved.db = true;
            audioInfo.dbAudioObj = dbAudio;
            audioInfo.audio_id = dbAudio.id;
            audioInfo.audio_guid = dbAudio.guid;

            resolve(audioInfo);

          }).catch(function(err){ 
            console.log("error linking audio format to audio entry to database | "+err);
            reject(new Error(err));
          });

      }).catch(function(err){
        console.log("error adding audio to database | "+err);
        reject(new Error(err));
      });     
    }.bind(this));
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
    return new Promise(function(resolve, reject) {

      try {

        var modelGuids = [  "8dfd93aa-b518-4ce3-a777-930a4ded1268",
                            "f331d725-df5c-4a43-b0e2-0d51ed7f5055",
                            "a5804661-b75a-4d62-9f91-a5ecfd64146d",
                            "87902751-d4b2-4831-8888-f31124e40830"
        ];

        for (i in modelGuids) {

          analysisUtils.queueAudioForAnalysis("rfcx-analysis", modelGuids[i], {
            audio_guid: audioInfo.audio_guid,
            api_url_domain: audioInfo.api_url_domain,
            audio_s3_bucket: process.env.ASSET_BUCKET_AUDIO,
            audio_s3_path: audioInfo.s3Path,
            audio_sha1_checksum: audioInfo.sha1Hash,
          }).then(function(){
          }).catch(function(err){
            console.log(err);
          });

        }

        audioInfo.isSaved.sqs = true;
        resolve(audioInfo);
      
      } catch(err) {
        console.log(err);
        reject(new Error(err));
      }

    }.bind(this));
  },


  rollBackCheckIn: function(audioInfo) {

    models.GuardianAudio.findOne({ where: { sha1_checksum: audioInfo.sha1Hash } }).then(function(dbAudio){ dbAudio.destroy().then(function(){ console.log("deleted incomplete audio entry"); }); }).catch(function(err){ console.log("failed to delete incomplete audio entry | "+err); });
    
    models.GuardianCheckIn.findOne({ where: { id: audioInfo.checkin_id } }).then(function(dbCheckIn){ dbCheckIn.destroy().then(function(){ console.log("deleted checkin entry"); }); }).catch(function(err){ console.log("failed to delete checkin entry | "+err); });
 
    cleanupCheckInFiles(audioInfo);
  }

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

