// var Promise = require('bluebird')
// var zlib = require('zlib')

exports.guardianMsgParsingUtils = {

  constructGuardianMsgObj: function (inputJsonObj, guardianId, guardianToken) {
    
    var msgObj = { 

      // input msg json
      json: inputJsonObj,
      
      // db objects
      db: { }, 

      // general msg meta
      meta: { 
        guardian: { },
        startTime: new Date()
      }, 

      // asset meta
      audio: { }, 
      screenshots: { }, 
      logs: { }, 
      photos: { }, 
      videos: { },
      
      // return cmd obj
      rtrn: {
        obj: {
          checkin_id: null,
          audio: [],
          screenshots: [],
          logs: [],
          messages: [],
          meta: [],
          photos: [],
          videos: [],
          purged: [],
          received: [],
          unconfirmed: [],
          prefs: [],
          instructions: [],
          segment: []
        }
      }
    };

    if (msgObj.json.guardian == null) { msgObj.json.guardian = {}; }
    if (guardianId != null) { msgObj.json.guardian.guid = guardianId; }
    if (guardianToken != null) { msgObj.json.guardian.token = guardianToken; }

    return msgObj;

  },


  msgSegmentConstants: function (protocol) {
  
    var segmentConstants = {


    };

    return segmentConstants;
  
  }

}


