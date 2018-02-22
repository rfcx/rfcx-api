var Promise = require("bluebird");
var zlib = require("zlib");
var cachedFiles = require("../../utils/internal-rfcx/cached-files.js").cachedFiles;
var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;

exports.mqttRouter = {

  onMessageCheckin: function(topic, data) {

    return new Promise(function(resolve,reject){
      if (topic == "guardians/checkins") {
        try {

          // cached file garbage collection... only do garbage collection ~1% of the time
          if (Math.random() < 0.01 ? true : false) { cachedFiles.cacheDirectoryGarbageCollection(); }

          var rtrnObj = { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [], instructions: { messages: [] } };

          mqttInputData.parseCheckInInput(data).then(function(checkInObj){

            if (checkInObj.audio.filePath != null) { rtrnObj.audio.push({ id: checkInObj.audio.metaArr[1] }); }
            if (checkInObj.screenshots.filePath != null) { rtrnObj.screenshots.push({ id: checkInObj.screenshots.metaArr[1] }); }
            if (checkInObj.logs.filePath != null) { rtrnObj.logs.push({ id: checkInObj.logs.metaArr[1] }); }




            zlib.gzip( new Buffer(JSON.stringify(rtrnObj), "utf8"), function(errJsonGzip, bufJsonGzip) {
              if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
                checkInObj.rtrn = { obj: rtrnObj, gzip: bufJsonGzip };
                resolve(checkInObj);
              }
            });

            

          }).catch(function(errParseCheckInInput){ console.log(errParseCheckInInput); reject(new Error(errParseCheckInInput)); });
        } catch (errOnMessageCheckin) { console.log(errOnMessageCheckin); reject(new Error(errOnMessageCheckin)); }
      } else {
        reject(new Error());
      }
    });

  }
  
};
