var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.screenshots = {

  info: function(screenShotFiles, screenShotMeta, guardianId, checkInId) {
    // make sure the screenshot files is an array
    if (!util.isArray(screenShotFiles)) { screenShotFiles = [screenShotFiles]; }
    
    var screenShotInfo = {};

    for (i in screenShotFiles) {

      console.log(screenShotMeta);

      // // this next line assumes there is only one screenshot attached
      // // ...so this should probably be updated to work like the rest of this section
      // var screenShotMeta = json.screenshots.split("|")[0].split("*");
      // var timeStamp = req.files.screenshot[i].originalname.substr(0,req.files.screenshot[i].originalname.lastIndexOf(".png"));
      // var dateString = (new Date(parseInt(timeStamp))).toISOString().substr(0,19).replace(/:/g,"-");
      // screenShotInfo[timeStamp] = {
      //    guardian_id: dbGuardian.guid,
      //    checkin_id: dbCheckIn.guid,
      //    screenshot_id: null, 
      //    version: null, // to be decided whether this is important to include here...
      //    uploadLocalPath: req.files.screenshot[i].path,
      //    size: fs.statSync(req.files.screenshot[i].path).size,
      //    sha1Hash: hash.fileSha1(req.files.screenshot[i].path),
      //    guardianSha1Hash: screenShotMeta[3],
      //    origin_id: timeStamp,
      //    timeStamp: timeStampToDate(timeStamp, json.timezone_offset),
      //    isSaved: false,
      //    s3Path: "/screenshots/"+process.env.NODE_ENV
      //             +"/"+dateString.substr(0,7)+"/"+dateString.substr(8,2)
      //             +"/"+dbGuardian.guid
      //             +"/"+dbGuardian.guid+"-"+dateString+".png"
      // };

    }

    // if (util.isArray(jsonMessages)) {         
    //   for (msgInd in jsonMessages) {
    //     messageInfo[jsonMessages[msgInd].android_id] = {
    //       android_id: jsonMessages[msgInd].android_id,
    //       guid: null,
    //       guardian_id: guardianId,
    //       checkin_id: checkInId,
    //       version: null,
    //       address: jsonMessages[msgInd].address,
    //       body: jsonMessages[msgInd].body,
    //       timeStamp: timeStampToDate(jsonMessages[msgInd].received_at, timezone_offset),
    //       isSaved: false
    //     };
    //   }
    // }
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
