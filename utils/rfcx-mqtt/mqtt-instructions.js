var verbose_logging = (process.env.NODE_ENV !== "production");
var fs = require("fs");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
var Promise = require('bluebird');
var loggers = require('../../utils/logger');

exports.mqttInstructions = {


  setupInstructionAction: function( dbGuardian, appRole ) {
    return new Promise(function(resolve, reject) {
        try {

          var instructionObj = { 
            mqtt: { 
              topic: "guardians/"+dbGuardian.guid+"/"+appRole.toLowerCase()+"/instructions" 
            }, 
            db: { 
              dbGuardian: dbGuardian 
            },
            rtrn: {
              obj: { instruction_id: null, messages: [], prefs: [] }
            }
          };

          resolve(instructionObj);

        } catch (errParseInstructionObj) { console.log(errParseInstructionObj); reject(new Error(errParseInstructionObj)); }
    }.bind(this));
  },



  processAndCompressInstructionJson: function(instructionObj) {
    return new Promise(function(resolve, reject) {
      try {
        zlib.gzip( new Buffer(JSON.stringify(instructionObj.rtrn.obj), "utf8"), function(errJsonGzip, bufJsonGzip) {
          if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
            instructionObj.rtrn.gzip = bufJsonGzip;
            resolve(instructionObj);
          }
        });
      } catch (errProcessInstructionJson) { console.log(errProcessInstructionJson); reject(new Error(errProcessInstructionJson)); }
    }.bind(this));
  }



};




