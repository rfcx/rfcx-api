var util = require("util");
var fs = require("fs");
var Promise = require("bluebird");
var models  = require("../../models");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;

exports.screenshots = {

  info: function(screenShotFiles, screenShotMeta, guardianId, guardianGuid, checkInId) {

    var screenShotInfo = {};

    if (!!screenShotFiles) {

      // make sure the screenshot files parameter is an array
      if (!util.isArray(screenShotFiles)) { screenShotFiles = [screenShotFiles]; }
      
      for (i in screenShotFiles) {

        var timeStamp = screenShotFiles[i].originalname.substr(0,screenShotFiles[i].originalname.lastIndexOf(".png"));
        var timeStampDateObj = new Date(parseInt(timeStamp));
        
        screenShotInfo[timeStamp] = {
          guardian_id: guardianId,
          checkin_id: checkInId,
          screenshot_id: null, 
          uploadLocalPath: screenShotFiles[i].path,
          size: fs.statSync(screenShotFiles[i].path).size,
          sha1Hash: hash.fileSha1(screenShotFiles[i].path),
          guardianSha1Hash: screenShotMeta[i][3],
          origin_id: timeStamp,
          timeStamp: timeStampDateObj,
          isSaved: false,
          s3Path: assetUtils.getGuardianAssetStoragePath("screenshots",timeStampDateObj,guardianGuid,"png")
          
        };
      }
    }
    return screenShotInfo;
  },

  save: function(screenShotInfo) {
    return new Promise(function(resolve, reject) {
        try {

          if (screenShotInfo.sha1Hash === screenShotInfo.guardianSha1Hash) {

            aws.s3(process.env.ASSET_BUCKET_META).putFile(
              screenShotInfo.uploadLocalPath, screenShotInfo.s3Path, 
              function(err, s3Res){
                try { s3Res.resume(); } catch (resumeErr) { console.log(resumeErr); }
                if (!!err) {
                  console.log(err);
                  reject(new Error(err));
                } else if (200 == s3Res.statusCode) {

                  if (aws.s3ConfirmSave(s3Res,screenShotInfo.s3Path)) {
                    
                    fs.unlink(screenShotInfo.uploadLocalPath,function(e){if(e){console.log(e);}});

                    models.GuardianMetaScreenShot.create({
                        guardian_id: screenShotInfo.guardian_id,
                        captured_at: screenShotInfo.timeStamp,
                        size: screenShotInfo.size,
                        sha1_checksum: screenShotInfo.sha1Hash,
                        url: null
                      }).then(function(dbGuardianMetaScreenShot){
                          // if all goes well, report it on the global object so we can tell at the end
                          screenShotInfo.isSaved = true;
                          screenShotInfo.screenshot_id = dbGuardianMetaScreenShot.guid;
                          screenShotInfo.guid = dbGuardianMetaScreenShot.guid;
                          resolve(screenShotInfo);
                          console.log("screenshot saved: "+screenShotInfo.origin_id);
                      }).catch(function(err){
                        console.log("error saving screenshot to db: "+screenShotInfo.origin_id+", "+err);
                        reject(new Error(err));
                      });
                  }   

                }
            });

          } else {
            console.log("screenshot checksum failed ("+screenShotInfo.origin_id+")");
            // even if checksum fails, we still (at least for now) want
            // to instruct to the guardian to delete the screenshot and move on
            screenShotInfo.isSaved = true;
            fs.unlink(screenShotInfo.uploadLocalPath,function(e){if(e){console.log(e);}});
            resolve(screenShotInfo);
          }

        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  }

};

