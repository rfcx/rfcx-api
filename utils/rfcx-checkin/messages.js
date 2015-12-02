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

  save: function(jsonMessages, guardianId, checkInId) {
    // need to return a promise
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
