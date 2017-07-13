var util = require("util");
var Promise = require("bluebird");
var models  = require("../../models");

exports.messages = {

  info: function(jsonMessages, guardianId, checkInId, timezone_offset) {
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
          timeStamp: new Date(parseInt(jsonMessages[msgInd].received_at)),
          isSaved: false
        };
      }
    }
    return messageInfo;
  },

  save: function(messageInfo) {
    return new Promise(function(resolve, reject) {
        try {
          models.GuardianMetaMessage.create({
              guardian_id: messageInfo.guardian_id,
              check_in_id: messageInfo.checkin_id,
              received_at: messageInfo.timeStamp,
              address: messageInfo.address,
              body: messageInfo.body,
              android_id: messageInfo.android_id
            }).then(function(dbGuardianMetaMessage){
              messageInfo.isSaved = true;
              messageInfo.guid = dbGuardianMetaMessage.guid;
              resolve(messageInfo);
              console.log("message saved: "+dbGuardianMetaMessage.guid);
            }).catch(function(err){
              console.log("error saving message: "+messageInfo.android_id+", "+messageInfo.body+", "+err);
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

