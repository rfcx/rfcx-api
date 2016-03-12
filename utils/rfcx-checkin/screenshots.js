var util = require("util");
var fs = require("fs");
var Promise = require("bluebird");
var models  = require("../../models");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();

exports.screenshots = {

  info: function(screenShotFiles, screenShotMeta, guardianId, guardianGuid, checkInId) {

    var screenShotInfo = {};

    if (!!screenShotFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(screenShotFiles)) { screenShotFiles = [screenShotFiles]; }
      
      for (i in screenShotFiles) {

        var timeStamp = screenShotFiles[i].originalname.substr(0,screenShotFiles[i].originalname.lastIndexOf(".png"));
        var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");
        
        screenShotInfo[timeStamp] = {
          guardian_id: guardianId,
          checkin_id: checkInId,
          screenshot_id: null, 
          uploadLocalPath: screenShotFiles[i].path,
          size: fs.statSync(screenShotFiles[i].path).size,
          sha1Hash: hash.fileSha1(screenShotFiles[i].path),
          guardianSha1Hash: screenShotMeta[i][3],
          origin_id: timeStamp,
          timeStamp: new Date(parseInt(timeStamp)),
          isSaved: false,
          s3Path: "/screenshots/"+process.env.NODE_ENV
                   +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
                   +"/"+guardianGuid
                   +"/"+guardianGuid+"-"+dateString+".png"
        };
        console.log(screenShotInfo);
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
                        url: screenShotInfo.s3Path
                      }).then(function(dbGuardianMetaScreenShot){
                          // if all goes well, report it on the global object so we can tell at the end
                          screenShotInfo.isSaved = true;
                          screenShotInfo.screenshot_id = dbGuardianMetaScreenShot.guid;
                          console.log("screenshot saved: "+screenShotInfo.origin_id);
                          resolve(screenShotInfo);
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
  },

  send: function() {

  }

};



function timeStampToDate(timeStamp, LEGACY_timeZoneOffset) {

  var asDate = null;

  // PLEASE MODIFY LATER WHEN WE NO LONGER NEED TO SUPPORT LEGACY TIMESTAMPS !!!!!
  if ((""+timeStamp).indexOf(":") > -1) {
    // LEGACY TIMESTAMP FORMAT
    asDate = new Date(timeStamp.replace(/ /g,"T")+LEGACY_timeZoneOffset);
  } else if (timeStamp != null) {
    
    asDate = new Date(parseInt(timeStamp));
  
  }
  return asDate;
}

