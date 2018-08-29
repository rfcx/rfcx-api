var Promise = require("bluebird");
var zlib = require("zlib");

exports.mqttPublish = {

  processAndCompressPublishJson: function(primaryObj) {
    return new Promise(function(resolve, reject) {
      try {
        zlib.gzip( new Buffer(JSON.stringify(primaryObj.rtrn.obj), "utf8"), function(errJsonGzip, bufJsonGzip) {
          if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
            primaryObj.rtrn.gzip = bufJsonGzip;
            resolve(primaryObj);
          }
        });
      } catch (errProcessPublishJson) { console.log(errProcessPublishJson); reject(new Error(errProcessPublishJson)); }
    }.bind(this));
  }

};


