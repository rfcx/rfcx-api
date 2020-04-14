var Promise = require('bluebird');
var models  = require("../../models");
var util = require("util");
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;

exports.mqttInstructions = {

  // processAndDispatchGuardianInstructions: function(checkInObj) {
  //   return new Promise(function(resolve,reject){
  //     try {
  //       this.updateReceivedGuardianInstructions(checkInObj).then(function(checkInObj){
  //         this.updateAndDispatchGuardianInstructions(checkInObj).then(function(checkInObj){
  //           resolve(checkInObj);
  //         }).catch(function(errDispatchInstructionAction){ console.log(errDispatchInstructionAction); });
  //       }).catch(function(errReceivedInstructionAction){ console.log(errReceivedInstructionAction); });
  //     } catch (errProcessInstruction) { console.log(errProcessInstruction); reject(new Error(errProcessInstruction)); }
  //   }.bind(this));
  // },

  updateReceivedGuardianInstructions: function(checkInObj) {
    return new Promise(function(resolve,reject){
      try {
        if ((checkInObj.json.instructions != null) && (checkInObj.json.instructions.received != null)) {
          for (var i = 0; i < checkInObj.json.instructions.received.length; i++) {
            if (checkInObj.json.instructions.received[i].guid != null) {
              models.GuardianMetaInstructionsQueue.findOne({
                where: {
                  guid: checkInObj.json.instructions.received[i].guid,
                  guardian_id: checkInObj.db.dbGuardian.id,
                  received_at: null
                }
              }).then(function(dbReceived){
                if (dbReceived != null) {
                  var receivedAt = null;
                  for (var j = 0; j < checkInObj.json.instructions.received.length; j++) {
                    if (checkInObj.json.instructions.received[j].guid == dbReceived.guid) {
                      dbReceived.received_at = new Date(parseInt(checkInObj.json.instructions.received[j].received_at));
                      dbReceived.save();
                      break;
                    }
                  }
                }
              }).catch(function(err){
                console.log("failed to update received instructions | "+err);
              });
            }
          }
          resolve(checkInObj);
        } else {
          resolve(checkInObj);
        }
     } catch (errReceivedInstruction) { console.log(errReceivedInstruction); reject(new Error(errReceivedInstruction)); }
    }.bind(this));
  },

  updateAndDispatchGuardianInstructions: function(checkInObj) {
    return new Promise(function(resolve,reject){
      try {

        var rtrnInstructions = [];

        models.GuardianMetaInstructionsQueue
            .findAll({
              where: { guardian_id: checkInObj.db.dbGuardian.id, received_at: null },
              order: [ ["created_at", "ASC"] ]
          }).then(function(dbQueued){

            for (dbQuInd in dbQueued) {
              if (dbQueued[dbQuInd].guid != null) {
                rtrnInstructions.push({
                  guid: dbQueued[dbQuInd].guid,
                  type: dbQueued[dbQuInd].type,
                  command: dbQueued[dbQuInd].command,
                  meta: JSON.parse(dbQueued[dbQuInd].meta_json),
                  execute_at: (dbQueued[dbQuInd].execute_at == null) ? 0 : dbQueued[dbQuInd].execute_at
                });

                dbQueued[dbQuInd].dispatch_attempts = dbQueued[dbQuInd].dispatch_attempts+1;
                dbQueued[dbQuInd].save();
              }
            }
            checkInObj.rtrn.obj.instructions = rtrnInstructions;
            resolve(checkInObj);

          }).catch(function(err){
            console.log("failed to return queued instructions | "+err);
          });
     } catch (errUpdateInstruction) { console.log(errUpdateInstruction); reject(new Error(errUpdateInstruction)); }
    }.bind(this));
  },


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


