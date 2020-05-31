var Promise = require("bluebird");
var zlib = require("zlib");

exports.mqttPublish = {

  processAndCompressPublishJson: function(checkInObj) {
    return new Promise(function(resolve, reject) {
      try {
        for (var prop in checkInObj.rtrn.obj) {
          if (!checkInObj.rtrn.obj.hasOwnProperty(prop)) continue;
          if (Array.isArray(checkInObj.rtrn.obj[prop]) && (checkInObj.rtrn.obj[prop].length == 0)) {
            delete checkInObj.rtrn.obj[prop];
          }
        }
        zlib.gzip( new Buffer(JSON.stringify(checkInObj.rtrn.obj), "utf8"), function(errJsonGzip, bufJsonGzip) {
          if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
            checkInObj.rtrn.gzip = bufJsonGzip;
            resolve(checkInObj);
          }
        });
      } catch (errProcessPublishJson) { console.log(errProcessPublishJson); reject(new Error(errProcessPublishJson)); }
    }.bind(this));
  }

};


