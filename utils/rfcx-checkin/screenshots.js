var util = require("util");
var fs = require("fs");
var Promise = require("bluebird");
var models  = require("../../models");
var hash = require("../../utils/misc/hash.js").hash;

exports.screenshots = {

  info: function(screenShotFiles, screenShotMeta, guardianId, checkInId) {

    var screenShotInfo = {};

    if (!!screenShotFiles) {

      // make sure the screenshot files is an array
      if (!util.isArray(screenShotFiles)) { screenShotFiles = [screenShotFiles]; }
      
      for (i in screenShotFiles) {

        console.log(screenShotMeta);

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
                   +"/"+guardianId
                   +"/"+guardianId+"-"+dateString+".png"
        };
        console.log(screenShotInfo);
      }
    }
    return screenShotInfo;
  },

  save: function(message) {
    return new Promise(function(resolve, reject) {
        try {
          // models.GuardianMetaMessage.create({
          //     guardian_id: message.guardian_id,
          //     check_in_id: message.checkin_id,
          //     received_at: message.timeStamp,
          //     address: message.address,
          //     body: message.body,
          //     android_id: message.android_id
          //   }).then(function(dbGuardianMetaMessage){
          //     resolve(dbGuardianMetaMessage);
          //     console.log("message saved: "+dbGuardianMetaMessage.guid);
          //   }).catch(function(err){
          //     console.log("error saving message: "+message.android_id+", "+message.body+", "+err);
          //     reject(new Error(err));
          //   });
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
