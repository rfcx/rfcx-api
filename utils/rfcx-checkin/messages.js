var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.messages = {

  buildInfo: function(jsonMessages, guardianId, checkInId, timezone_offset) {
    var messageInfo = {};
    if (util.isArray(jsonMessages)) {         
      for (msgInd in jsonMessages) {
        messageInfo[jsonMessages[msgInd].android_id] = {
          android_id: jsonMessages[msgInd].android_id,
          guid: null,
          guardian_id: guardianId,
          checkin_id: checkInId,
          version: null,
          address: jsonMessages[msgInd].address,
          body: jsonMessages[msgInd].body,
          timeStamp: timeStampToDate(jsonMessages[msgInd].received_at, timezone_offset),
          isSaved: false
        };
      }
    }
    return messageInfo;
  },

  save: function(message) {
    return new Promise(function(resolve, reject) {
        try {
          models.GuardianMetaMessage.create({
              guardian_id: message.guardian_id,
              check_in_id: message.checkin_id,
              received_at: message.timeStamp,
              address: message.address,
              body: message.body,
              android_id: message.android_id
            }).then(function(dbGuardianMetaMessage){
              resolve(dbGuardianMetaMessage);
              console.log("message saved: "+dbGuardianMetaMessage.guid);
            }).catch(function(err){
              console.log("error saving message: "+message.android_id+", "+message.body+", "+err);
              reject(new Error(err));
            });
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
