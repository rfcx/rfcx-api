var verbose_logging = (process.env.NODE_ENV !== "production");
var fs = require("fs");
var zlib = require("zlib");
var hash = require("../../utils/misc/hash.js").hash;
var aws = require("../../utils/external/aws.js").aws();
var assetUtils = require("../../utils/internal-rfcx/asset-utils.js").assetUtils;
var Promise = require('bluebird');
var loggers = require('../../utils/logger');

exports.mqttInstructions = {

  processAndCompressInstructionJson: function(instructionObject) {
    return new Promise(function(resolve, reject) {

        try {

          var instructionJson = { 
            instructions: { 
              messages: [] 
            } 
          };

          zlib.gzip( new Buffer(JSON.stringify(instructionJson), "utf8"), function(errJsonGzip, bufJsonGzip) {
            if (errJsonGzip) { console.log(errJsonGzip); reject(new Error(errJsonGzip)); } else {
              resolve(bufJsonGzip);
            }
          });
     
        } catch (errProcessInstructionJson) { console.log(errProcessInstructionJson); reject(new Error(errProcessInstructionJson)); }

    }.bind(this));
  }



};




