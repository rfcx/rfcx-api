var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;

exports.audio = {

  info: function(audioFiles, audioMeta, guardianGuid, checkInGuid) {

    var audioInfo = {};

    if (!!audioFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(audioFiles)) { audioFiles = [audioFiles]; }
        
      if (audioMeta.length == audioFiles.length) {

        for (i in audioFiles) {

          var timeStamp = audioMeta[i][1]; 
          var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");

          audioInfo[timeStamp] = {
            guardian_id: guardianGuid,
            checkin_id: checkInGuid,
            guardianSha1Hash: audioMeta[i][3],
            uploadLocalPath: audioFiles[i].path,
            unzipLocalPath: audioFiles[i].path.substr(0,audioFiles[i].path.lastIndexOf("."))+"."+audioMeta[i][2],
            size: null, // to be calculated following the uncompression
            sha1Hash: null, // to be calculated following the uncompression
            duration: null,
            timeStamp: timeStamp,
            measured_at: new Date(parseInt(timeStamp)),
            api_token_guid: null,
            api_token: null,
            api_token_expires_at: null,
            api_url: null,
            isSaved: { db: false, s3: false, sqs: false },
            s3Path: "/"+process.env.NODE_ENV
                   +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                   +"/"+guardianGuid
                   +"/"+guardianGuid+"-"+dateString+"."+audioMeta[i][2]
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




            } else {
              console.log("checksum mismatch on uploaded (and unzipped) audio file | "+audioInfo.sha1Hash + " - " + audioInfo.guardianSha1Hash);
              reject(new Error(err));
            }

          });

          // if (screenShotInfo.sha1Hash === screenShotInfo.guardianSha1Hash) {

          //   aws.s3(process.env.ASSET_BUCKET_META).putFile(
          //     screenShotInfo.uploadLocalPath, screenShotInfo.s3Path, 
          //     function(err, s3Res){
          //       try { s3Res.resume(); } catch (resumeErr) { console.log(resumeErr); }
          //       if (!!err) {
          //         console.log(err);
          //         reject(new Error(err));
          //       } else if (200 == s3Res.statusCode) {

          //         if (aws.s3ConfirmSave(s3Res,screenShotInfo.s3Path)) {
                    
          //           fs.unlink(screenShotInfo.uploadLocalPath,function(e){if(e){console.log(e);}});

          //           models.GuardianMetaScreenShot.create({
          //               guardian_id: screenShotInfo.guardian_id,
          //               captured_at: screenShotInfo.timeStamp,
          //               size: screenShotInfo.size,
          //               sha1_checksum: screenShotInfo.sha1Hash,
          //               url: screenShotInfo.s3Path
          //             }).then(function(dbGuardianMetaScreenShot){
          //                 // if all goes well, report it on the global object so we can tell at the end
          //                 screenShotInfo.isSaved = true;
          //                 screenShotInfo.screenshot_id = dbGuardianMetaScreenShot.guid;
          //                 screenShotInfo.guid = dbGuardianMetaScreenShot.guid;
          //                 resolve(screenShotInfo);
          //                 console.log("screenshot saved: "+screenShotInfo.origin_id);
          //             }).catch(function(err){
          //               console.log("error saving screenshot to db: "+screenShotInfo.origin_id+", "+err);
          //               reject(new Error(err));
          //             });
          //         }   

          //       }
          //   });

          // } else {
          //   console.log("screenshot checksum failed ("+screenShotInfo.origin_id+")");
          //   // even if checksum fails, we still (at least for now) want
          //   // to instruct to the guardian to delete the screenshot and move on
          //   screenShotInfo.isSaved = true;
          //   fs.unlink(screenShotInfo.uploadLocalPath,function(e){if(e){console.log(e);}});
          //   resolve(screenShotInfo);
          // }

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  }

};


