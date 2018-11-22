var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var exec = require("child_process").exec;
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var audioUtils = require("../../../utils/rfcx-audio").audioUtils;
var assetUtils = require("../../../utils/internal-rfcx/asset-utils.js").assetUtils;
var validation = require("../../../utils/misc/validation.js");
function getAllViews() {
  return require("../../../views/v1");
}


exports.models = {

  guardianAudioFile: function (req, res, dbRow) {

    var output_file_extension = req.rfcx.content_type,
        output_file_name = dbRow.guid + "." + output_file_extension,
        is_output_enhanced = (output_file_extension === "mp3");

    // auto-generate the asset filepath if it's not stored in the url column
    var audioStorageUrl = (dbRow.url == null)
              ? "s3://"+process.env.ASSET_BUCKET_AUDIO+assetUtils.getGuardianAssetStoragePath("audio",dbRow.measured_at,dbRow.Guardian.guid,dbRow.Format.file_extension)
              : dbRow.url;


    audioUtils.cacheSourceAudio(audioStorageUrl)
      .then(function (sourceFilePath) {

        if (dbRow.Format.file_extension === output_file_extension) {

          console.log("serving " + output_file_extension + " file without transcoding");

          audioUtils.serveAudioFromFile(res, sourceFilePath, output_file_name, audioUtils.formatSettings[output_file_extension].mime)
            .then(function () {
              // should we do/log anything if we're successful?
            }).catch(function (err) {
              console.log(err);
            });

        } else {

          console.log("transcoding " + dbRow.Format.file_extension + " audio to " + output_file_extension);

          audioUtils.transcodeToFile(output_file_extension, {
            enhanced: is_output_enhanced,
            bitRate: is_output_enhanced ? "32k" : "16k",
            sampleRate: dbRow.Format.sample_rate,
            sourceFilePath: sourceFilePath
          }).then(function (outputFilePath) {
            audioUtils.serveAudioFromFile(res, outputFilePath, output_file_name, audioUtils.formatSettings[output_file_extension].mime)
              .then(function () {
                // should we do/log anything if we're successful?
              }).catch(function (err) {
                console.log(err);
              });
          }).catch(function (err) {
            console.log(err);
          });
        }

      }).catch(function (err) {
        console.log(err);
        res.status(500).json({msg: "failed to download audio"});
      });

  },


  guardianAudioAmplitude: function (req, res, dbRow) {

    return new Promise(function (resolve, reject) {

      // auto-generate the asset filepath if it's not stored in the url column
      var audioStorageUrl = (dbRow.url == null)
              ? "s3://"+process.env.ASSET_BUCKET_AUDIO+assetUtils.getGuardianAssetStoragePath("audio",dbRow.measured_at,dbRow.Guardian.guid,dbRow.Format.file_extension)
              : dbRow.url;

      audioUtils.cacheSourceAudio(audioStorageUrl)
        .then(function (sourceFilePath) {

          audioUtils.transcodeToFile("wav", {
            enhanced: false,
            sampleRate: dbRow.Format.sample_rate,
            sourceFilePath: sourceFilePath
          }).then(function (outputFilePath) {

            var amplitudeType = "RMS";
            var allowedWindowDurations = [ 250, 500, 1000, 2000 ];
            var windowDurationMs = (allowedWindowDurations.indexOf(parseInt(req.query.window_duration)) >= 0) ? parseInt(req.query.window_duration) : 500;
            var windowDurationSec = windowDurationMs / 1000;

            var soxExec = "";

            for (var i = 0; i < ((dbRow.capture_sample_count/dbRow.Format.sample_rate)/windowDurationSec); i++) {
              if (i > 0) { soxExec += " && "; }
              soxExec += "echo \"$("+process.env.SOX_PATH+" "+outputFilePath+" -n trim "+(windowDurationSec*i)+" "+windowDurationSec+" stat 2>&1)\""
                          +" | grep \""+amplitudeType+"\" | grep \"amplitude\" | cut -d':' -f 2 | sed -e 's/^[ \\t]*//'";
            }

            exec(soxExec, function (err, stdout, stderr) {

              if (stderr.trim().length > 0) { console.log(stderr); }
              if (!!err) { console.log(err); }
              fs.unlink(outputFilePath, function (e) { if (e) { console.log(e); } });

              var allStringAmplitudes = stdout.trim().split("\n");
              var allAmplitudes = [];
              for (var i = 0; i < allStringAmplitudes.length; i++) {
                allAmplitudes.push(parseFloat(allStringAmplitudes[i]));
              }

              resolve([{
                guid: dbRow.guid,
                duration: Math.round(1000 * dbRow.capture_sample_count / dbRow.Format.sample_rate),
                amplitude: {
                  window_duration: windowDurationMs,
                  type: amplitudeType.toLowerCase(),
                  values: allAmplitudes
                }
              }]);

            });

          }).catch(function (err) {
            console.log(err);
            reject(new Error(err));
          });

        }).catch(function (err) {
          reject(new Error(err));
        });

      });

  },



  guardianAudioSpectrogram: function (req, res, dbRow) {

    var soxSettings = {
      zAxis: 95, // color range in dB, ranging from 20 to 180
      windowFunc: // window function options listed below (select only one)
        "Dolph" //  "Hann"  "Hamming"  "Bartlett"  "Rectangular"  "Kaiser"
    };

    var tmpFilePath = process.env.CACHE_DIRECTORY + "ffmpeg/" + hash.randomString(32);

    var specWidth = (req.query.width == null) ? 2048 : parseInt(req.query.width);
    if (specWidth > 4096) { specWidth = 4096; } else if (specWidth < 1) { specWidth = 1; }

    var specHeight = (req.query.height == null) ? 512 : parseInt(req.query.height);
    if (specHeight > 1024) { specHeight = 1024; } else if (specHeight < 1) { specHeight = 1; }

    var specRotate = (req.query.rotate == null) ? 0 : parseInt(req.query.rotate);
    if ((specRotate != 90) && (specRotate != 180) && (specRotate != 270)) { specRotate = 0; }

    var clipDurationFull = (dbRow.capture_sample_count / dbRow.Format.sample_rate);

    var clipOffset = (req.query.offset == null) ? 0 : (parseInt(req.query.offset) / 1000);
    if (clipOffset > clipDurationFull) { clipOffset = 0; } else if (clipOffset < 0) { clipOffset = 0; }

    var clipDuration = (req.query.duration == null) ? clipDurationFull : (parseInt(req.query.duration) / 1000);
    if ((clipOffset + clipDuration) > clipDurationFull) { clipDuration = (clipDurationFull - clipOffset); } else if (clipDuration < 0) { clipDuration = (clipDurationFull - clipOffset); }

    // auto-generate the asset filepath if it's not stored in the url column
    var audioStorageUrl = (dbRow.url == null)
              ? "s3://"+process.env.ASSET_BUCKET_AUDIO+assetUtils.getGuardianAssetStoragePath("audio",dbRow.measured_at,dbRow.Guardian.guid,dbRow.Format.file_extension)
              : dbRow.url;

    audioUtils.cacheSourceAudio(audioStorageUrl)
      .then(function (sourceFilePath) {

        var ffmpegSox = 
            process.env.FFMPEG_PATH 
              + " -i " + sourceFilePath + " -loglevel panic -nostdin"
              + " -ac 1 -ar " + dbRow.Format.sample_rate
              + " -ss " + clipOffset + " -t " + clipDuration
              + " -f sox - "
            + " | " + process.env.SOX_PATH 
              + " -t sox - -n spectrogram -h -r"
              + " -o " + tmpFilePath+"-sox.png"
              + " -x " + specWidth + " -y " + specHeight
              + " -w " + soxSettings.windowFunc + " -z " + soxSettings.zAxis + " -s"
              + " -d " + clipDuration;

        var imageMagick = 
            (specRotate == 0) ? "cp " + tmpFilePath + "-sox.png " + tmpFilePath + "-rotated.png"
            : process.env.IMAGEMAGICK_PATH + " " + tmpFilePath + "-sox.png" + " -rotate " + specRotate + " " + tmpFilePath + "-rotated.png";

        var pngCrush = 
            process.env.PNGCRUSH_PATH + " " + tmpFilePath + "-rotated.png" + " " + tmpFilePath + "-final.png";

        exec( ffmpegSox + " && " + imageMagick + " && " + pngCrush, function (err, stdout, stderr) {

          if (stderr.trim().length > 0) {
            console.log(stderr);
          }
          if (!!err) {
            console.log(err);
          }

          fs.unlink(sourceFilePath, function (e) { if (e) { console.log(e); } });
          fs.unlink(tmpFilePath+"-sox.png", function (e) { if (e) { console.log(e); } });
          fs.unlink(tmpFilePath+"-rotated.png", function (e) { if (e) { console.log(e); } });

          audioUtils.serveAudioFromFile(res, tmpFilePath+"-final.png", dbRow.guid + ".png", "image/png")
            .then(function () {
              // should we do/log anything if we're successful?
            }).catch(function (err) {
              console.log(err);
            });

        });

      }).catch(function (err) {
        console.log(err);
        res.status(500).json({msg: "failed to download audio"});
      });

  },

  guardianAudioJson: function (req, res, dbRows, PARENT_GUID) {

    var views = getAllViews();

    if (!util.isArray(dbRows)) {
      dbRows = [dbRows];
    }

    return new Promise(function (resolve, reject) {

      if (!dbRows.length) {
        resolve([]);
      }

      let proms = [];
      let jsonArr = [];

      dbRows.forEach((thisRow) => {
        let guid = thisRow.guid;

        let prom = token.createAnonymousToken({
          reference_tag: guid,
          token_type: 'audio-file',
          minutes_until_expiration: 30,
          created_by: null,
          allow_garbage_collection: false,
          only_allow_access_to: [
            `^/v1/assets/audio/${guid}.m4a$`,
            `^/v1/assets/audio/${guid}.mp3$`,
            `^/v1/assets/audio/${guid}.opus$`,
            `^/v1/assets/audio/${guid}.png$`
          ]
        });

        proms.push(prom);

      });

      Promise.all(proms)
        .then((tokens) => {
          tokens.forEach((token, index) => {
            let thisRow = dbRows[index];
            let json = {
              guid: thisRow.guid,
              measured_at: thisRow.measured_at,
              analyzed_at: thisRow.analyzed_at,
              size: thisRow.size,
              duration: null,
              sample_rate: thisRow.Format? thisRow.Format.sample_rate : null,
              sha1_checksum: thisRow.sha1_checksum
            };
            if (!!thisRow.Format) {
              json.duration = Math.round(1000 * thisRow.capture_sample_count / thisRow.Format.sample_rate)
            }
            if (!!thisRow.Site) {
              json.site_guid = thisRow.Site.guid;
              json.timezone_offset = thisRow.Site.timezone_offset;
              json.timezone = thisRow.Site.timezone;
            }
            if (!!thisRow.Guardian) {
              json.guardian_guid = thisRow.Guardian.guid;
            }
            if (!!thisRow.CheckIn) {
              json.checkin_guid = thisRow.CheckIn.guid;
            }
            if (!!PARENT_GUID) {
              json.PARENT_GUID = PARENT_GUID;
            }

            let urlBase = `${process.env.ASSET_URLBASE}/audio/${thisRow.guid}`;
            json.urls = {
              m4a: `${urlBase}.m4a`,
              mp3: `${urlBase}.mp3`,
              opus: `${urlBase}.opus`,
              png: `${urlBase}.png`
            };

            json.urls_expire_at = token.token_expires_at;

            jsonArr.push(json);
          });

          resolve(jsonArr);
        })
        .catch((err) => {
          console.log("failed to create anonymous token | " + err);
          reject(new Error(err));
        });

    });

  },
  guardianAudioLabels: function (req, res, labels) {
    return new Promise(function (resolve, reject) {
      if (labels == null || !Array.isArray(labels) || labels.length == 0) {
        reject(new Error("The returned labels were fewer than 1"));
      }

      var last = -2000;
      var expectedLength = 2000;

      for (var i = 0; i < labels.length; i++) {
        var current = labels[i].begins_at;
        var length = current - last;
        if (length != expectedLength) {
          result.status = "ERROR";
          reject(new Error("The length of windows should be two thousand miliseconds but was " + length));
        }
        last = current;
      }

      var labelValues = labels.map(function (label) {
        return label.label;
      });

      resolve(labelValues);
    });
  },

  transformCreateAudioRequestToModel: function(reqObj){

    return Promise.resolve().then(function () {
      var requiredAttributes = ["site_id", "guardian_id", "measured_at", "size", "sha1_checksum", "format_id", "capture_sample_count"];
      validation.assertAttributesExist(reqObj, requiredAttributes);

      console.info("assertions correct");

      // default
      var modelObj = {};


      // copy attributes to make sure that the request doesn't set columns we don't want it to set
      for(var i=0; i < requiredAttributes.length; i++){
        var attr = requiredAttributes[i];
        modelObj[attr] = reqObj[attr];
      }

      return modelObj;
    });

  }


};

