var Promise = require("bluebird");
var zlib = require("zlib");

var mqttInputData = require("../../utils/rfcx-mqtt/mqtt-input-data.js").mqttInputData;

exports.mqttRouter = {

  onMessageCheckin: function(topic, data) {

    return new Promise(function(resolve,reject){
      if (topic == "guardians/checkins") {
        try {

          var rtrnObj = { checkin_id: null, audio: [], screenshots: [], logs: [], messages: [], instructions: { messages: [] } };

          mqttInputData.parseCheckInInput(data).then(function(checkInData){

            if (checkInData.audio.filePath != null) { rtrnObj.audio.push({ id: checkInData.audio.metaArr[1] }); }
            if (checkInData.screenshots.filePath != null) { rtrnObj.screenshots.push({ id: checkInData.screenshots.metaArr[1] }); }
            if (checkInData.logs.filePath != null) { rtrnObj.logs.push({ id: checkInData.logs.metaArr[1] }); }




            zlib.gzip( new Buffer(JSON.stringify(rtrnObj), "utf8"), function(errJsonGzip, bufJsonGzip) {
              if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
                checkInData.rtrn = { obj: rtrnObj, gzip: bufJsonGzip };
                resolve(checkInData);
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
