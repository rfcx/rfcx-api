var Promise = require('bluebird');
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;

 var mqttInstructions = {

  sendInstruction: function(appMqtt, guardianGuid, guardianRole) {
    return new Promise(function(resolve,reject){
      try {

        this.setupInstructionAction( guardianGuid, guardianRole ).then(function(instructionObj){
          mqttPublish.processAndCompressPublishJson(instructionObj).then(function(instructionObj){

            appMqtt.publish(instructionObj.mqtt.topic, instructionObj.rtrn.gzip);
            console.log(JSON.stringify(instructionObj.rtrn.obj));

          }).catch(function(errProcessInstructionJson){ console.log(errProcessInstructionJson); reject(new Error(errProcessInstructionJson)); });
        }).catch(function(errSetupInstructionAction){ console.log(errSetupInstructionAction); });

     } catch (errSendInstruction) { console.log(errSendInstruction); reject(new Error(errSendInstruction)); }
    }.bind(this));
  },


  setupInstructionAction: function( guardianGuid, guardianRole ) {
    return new Promise(function(resolve, reject) {
        try {

          var instructionObj = { 
            mqtt: { 
              topic: "guardians/"+guardianGuid+"/"+guardianRole.toLowerCase()+"/instructions" 
            }, 
            db: { 
            },
            rtrn: {
              obj: { instruction_id: null, messages: [], prefs: [] }
            }
          };

          resolve(instructionObj);

        } catch (errParseInstructionObj) { console.log(errParseInstructionObj); reject(new Error(errParseInstructionObj)); }
    }.bind(this));
  }



};

exports.mqttInstructions = mqttInstructions;


