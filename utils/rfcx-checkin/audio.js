var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;

var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;

exports.audio = {

  info: function(audioFiles, audioMeta, dbGuardian, dbCheckIn) {

    // REMOVE LATER
    // cached file garbage collection... 
    cachedFiles.cacheDirectoryGarbageCollection();

    var audioInfo = {};

    if (!!audioFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(audioFiles)) { audioFiles = [audioFiles]; }
        
      if (audioMeta.length == audioFiles.length) {

        for (i in audioFiles) {

          var timeStamp = audioMeta[i][1]; 
          var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");

          audioInfo[timeStamp] = {
            guardian_id: dbGuardian.id,
            guardian_guid: dbGuardian.guid,
            checkin_id: dbCheckIn.id,
            checkin_guid: dbCheckIn.guid,
            site_id: dbGuardian.site_id,
            guardianSha1Hash: audioMeta[i][3],
            uploadLocalPath: audioFiles[i].path,
            unzipLocalPath: audioFiles[i].path.substr(0,audioFiles[i].path.lastIndexOf("."))+"."+audioMeta[i][2],
            size: null, // to be calculated following the uncompression
            sha1Hash: null, // to be calculated following the uncompression
            
            duration: (audioMeta[i][7] != null) ? parseInt(audioMeta[i][7]) : null,
            capture_format: null,
            capture_bitrate: (audioMeta[i][5] != null) ? parseInt(audioMeta[i][5]) : null,
            capture_sample_rate: (audioMeta[i][4] != null) ? parseInt(audioMeta[i][4]) : null,

            timeStamp: timeStamp,
            measured_at: new Date(parseInt(timeStamp)),
            api_token_guid: null,
            api_token: null,
            api_token_expires_at: null,
            api_url: null,
            isSaved: { db: false, s3: false, sqs: false },
            s3Path: "/"+process.env.NODE_ENV
                   +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                   +"/"+dbGuardian.guid
                   +"/"+dbGuardian.guid+"-"+dateString+"."+audioMeta[i][2]
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
              // retrieve unzipped file size
              audioInfo.size = fs.statSync(audioInfo.unzipLocalPath).size;

              resolve(audioInfo);

            } else {
              console.log("checksum mismatch on uploaded (and unzipped) audio file | "+audioInfo.sha1Hash + " - " + audioInfo.guardianSha1Hash);
              reject(new Error(err));
            }

          });

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  },

  saveToDb: function(audioInfo) {
    return new Promise(function(resolve, reject) {

      models.GuardianAudio.create({
        guardian_id: audioInfo.guardian_id,
        site_id: audioInfo.site_id,
        check_in_id: audioInfo.site_id,
        sha1_checksum: audioInfo.sha1Hash,
        url: "s3://"+process.env.ASSET_BUCKET_AUDIO+audioInfo.s3Path,
        size: audioInfo.size,
        duration: audioInfo.duration,
        measured_at: audioInfo.measured_at
      }).then(function(dbAudio){


      }).catch(function(err){
        console.log("error adding audio to database | "+err);
//      dbCheckIn.destroy().then(function(){ console.log("deleted incomplete checkin entry"); }).catch(function(err){ console.log("failed to delete incomplete checkin entry | "+err); });
//      models.GuardianAudio.findOne({ where: { sha1_checksum: audioInfo[j].sha1Hash } }).then(function(dbAudio){ dbAudio.destroy().then(function(){ console.log("deleted incomplete audio entry"); }); }).catch(function(err){ console.log("failed to delete incomplete audio entry | "+err); });
        reject(new Error(err));
      });     
    }.bind(this));
  }

};


