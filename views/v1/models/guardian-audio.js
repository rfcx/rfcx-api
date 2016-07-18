var util = require("util");
var Promise = require("bluebird");
var aws = require("../../../utils/external/aws.js").aws();
var exec = require("child_process").exec;
var ffmpeg = require("fluent-ffmpeg");
var fs = require("fs");
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var audioUtils = require("../../../utils/rfcx-audio").audioUtils;
function getAllViews() {
  return require("../../../views/v1");
}


exports.models = {

  guardianAudioFile: function (req, res, dbRow) {

    var output_file_extension = req.rfcx.content_type,
      output_file_name = dbRow.guid + "." + output_file_extension;

    audioUtils.cacheSourceAudio(dbRow.url)
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
            enhanced: (output_file_extension === "mp3"),
            bitRate: (output_file_extension === "mp3") ? "32k" : "16k",
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


  guardianAudioSpectrogram: function (req, res, dbRow) {

    var specSettings = {
      tmpFilePath: process.env.CACHE_DIRECTORY + "ffmpeg/" + hash.randomString(32) + ".png",
      specWidth: 2048, specHeight: 512,
      zAxis: 95, // color range in dB, ranging from 20 to 180
      windowFunc: // window function options listed below (select only one)
        "Dolph" //  "Hann"  "Hamming"  "Bartlett"  "Rectangular"  "Kaiser"
    };

    audioUtils.cacheSourceAudio(dbRow.url)
      .then(function (sourceFilePath) {

        var ffmpegSox = process.env.FFMPEG_PATH + " -i " + sourceFilePath + " -loglevel panic -nostdin"
            + " -ac 1 -ar " + dbRow.Format.sample_rate
            + " -f sox - "
            + " | " + process.env.SOX_PATH + " -t sox - -n spectrogram -h -r"
            + " -o " + specSettings.tmpFilePath
            + " -x " + specSettings.specWidth + " -y " + specSettings.specHeight
            + " -w " + specSettings.windowFunc + " -z " + specSettings.zAxis + " -s"
            + " -d " + (dbRow.capture_sample_count / dbRow.Format.sample_rate)
          ;

        exec(ffmpegSox, function (err, stdout, stderr) {

          if (stderr.trim().length > 0) {
            console.log(stderr);
          }
          if (!!err) {
            console.log(err);
          }

          fs.unlink(sourceFilePath, function (e) {
            if (e) {
              console.log(e);
            }
          });

          audioUtils.serveAudioFromFile(res, specSettings.tmpFilePath, dbRow.guid + ".png", "image/png")
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

    var jsonArray = [], jsonRowsByGuid = {}, dbRowsByGuid = {};

    return new Promise(function (resolve, reject) {

      for (i in dbRows) {

        var thisRow = dbRows[i], thisGuid = thisRow.guid;

        dbRowsByGuid[thisGuid] = thisRow;

        jsonRowsByGuid[thisGuid] = {
          guid: thisGuid,
          measured_at: thisRow.measured_at,
          analyzed_at: thisRow.analyzed_at,
          size: thisRow.size,
          duration: Math.round(1000 * thisRow.capture_sample_count / thisRow.Format.sample_rate),
          sample_rate: thisRow.Format.sample_rate,
          sha1_checksum: thisRow.sha1_checksum
        };

        if (thisRow.Site != null) {
          jsonRowsByGuid[thisGuid].site_guid = thisRow.Site.guid;
        }
        if (thisRow.Guardian != null) {
          jsonRowsByGuid[thisGuid].guardian_guid = thisRow.Guardian.guid;
        }
        if (thisRow.CheckIn != null) {
          jsonRowsByGuid[thisGuid].checkin_guid = thisRow.CheckIn.guid;
        }

        if (PARENT_GUID != null) {
          jsonRowsByGuid[thisGuid].PARENT_GUID = PARENT_GUID;
        }

        return token.createAnonymousToken({
          reference_tag: thisGuid,
          token_type: "audio-file",
          minutes_until_expiration: 30,
          created_by: null,
          allow_garbage_collection: false,
          only_allow_access_to: [
            "^/v1/assets/audio/" + thisGuid + ".m4a$",
            "^/v1/assets/audio/" + thisGuid + ".mp3$",
            "^/v1/assets/audio/" + thisGuid + ".opus$",
            "^/v1/assets/audio/" + thisGuid + ".png$"
          ]
        }).then(function (tokenInfo) {
          try {

            var thisRow = dbRowsByGuid[tokenInfo.reference_tag], thisGuid = thisRow.guid,
              urlBase = process.env.ASSET_URLBASE + "/audio/" + thisGuid,
              urlAuthParams = "?auth_user=token/" + tokenInfo.token_guid
                + "&auth_token=" + tokenInfo.token
                + "&auth_expires_at=" + tokenInfo.token_expires_at.toISOString();

            jsonRowsByGuid[thisGuid].urls = {
              m4a: urlBase + ".m4a",
              mp3: urlBase + ".mp3",
              opus: urlBase + ".opus",
              png: urlBase + ".png"
            };

            jsonRowsByGuid[thisGuid].urls_expire_at = tokenInfo.token_expires_at;

            jsonArray.push(jsonRowsByGuid[thisGuid]);
            if (jsonArray.length == dbRows.length) {
              resolve(jsonArray);
            }

          } catch (e) {
            reject(e);
          }

          return null;
        }).catch(function (err) {
          console.log("failed to create anonymous token | " + err);
          reject(new Error(err));
        });
      }
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
  }


};

