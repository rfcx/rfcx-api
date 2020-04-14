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
        if (checkInObj.instructions == null) { checkInObj.instructions = {}; };
        if ((checkInObj.json.instructions != null) && (checkInObj.json.instructions.received != null)) {
          if (checkInObj.json.instructions.received.length == 0) {
            resolve(checkInObj);
          } else {
            for (var i = 0; i < checkInObj.json.instructions.received.length; i++) {
              if (checkInObj.json.instructions.received[i].guid != null) {

                // cache instruction info
                var recGuid = checkInObj.json.instructions.received[i].guid;
                if (checkInObj.instructions[recGuid] == null) { checkInObj.instructions[recGuid] = {}; };
                checkInObj.instructions[recGuid].received_at = new Date(parseInt(checkInObj.json.instructions.received[i].received_at));

                models.GuardianMetaInstructionsQueue.findOne({
                  where: {
                    guid: recGuid,
                    guardian_id: checkInObj.db.dbGuardian.id,
                    received_at: null
                  }
                }).then(function(dbQueued){
                  if (dbQueued != null) {
                    dbQueued.received_at = checkInObj.instructions[dbQueued.guid].received_at;
                    dbQueued.save();
                    resolve(checkInObj);
                  } else {
                    resolve(checkInObj);
                  }
                }).catch(function(err){
                  console.log("failed to update received instructions | "+err);
                });
              }
            }
          }
        } else {
          resolve(checkInObj);
        }
     } catch (errReceivedInstruction) { console.log(errReceivedInstruction); reject(new Error(errReceivedInstruction)); }
    }.bind(this));
  },

  updateExecutedGuardianInstructions: function(checkInObj) {
    return new Promise(function(resolve,reject){
      try {
        if (checkInObj.instructions == null) { checkInObj.instructions = {}; };
        if ((checkInObj.json.instructions != null) && (checkInObj.json.instructions.executed != null)) {
          if (checkInObj.json.instructions.executed.length == 0) {
            resolve(checkInObj);
          } else {
            for (var i = 0; i < checkInObj.json.instructions.executed.length; i++) {
              if (checkInObj.json.instructions.executed[i].guid != null) {

                // cache instruction info
                var execGuid = checkInObj.json.instructions.executed[i].guid;
                if (checkInObj.instructions[execGuid] == null) { checkInObj.instructions[execGuid] = {}; };
                checkInObj.instructions[execGuid].executed_at = new Date(parseInt(checkInObj.json.instructions.executed[i].executed_at));
                checkInObj.instructions[execGuid].received_at = new Date(parseInt(checkInObj.json.instructions.executed[i].received_at));
                checkInObj.instructions[execGuid].response = checkInObj.json.instructions.executed[i].response;
                checkInObj.instructions[execGuid].execution_attempts = parseInt(checkInObj.json.instructions.executed[i].attempts);
                
                models.GuardianMetaInstructionsQueue.findOne({
                  where: {
                    guid: execGuid,
                    guardian_id: checkInObj.db.dbGuardian.id
                  }
                }).then(function(dbQueued){
                  if (dbQueued != null) {

                    models.GuardianMetaInstructionsLog.findOrCreate({
                      where: {
                        guid: dbQueued.guid,
                        queued_at: dbQueued.queued_at,
                        executed_at: checkInObj.instructions[dbQueued.guid].executed_at,
                        received_at: checkInObj.instructions[dbQueued.guid].received_at,
                        response_json: checkInObj.instructions[dbQueued.guid].response,
                        type: dbQueued.type,
                        command: dbQueued.command,
                        meta_json: dbQueued.meta_json,
                        dispatch_attempts: dbQueued.dispatch_attempts,
                        execution_attempts: checkInObj.instructions[dbQueued.guid].execution_attempts,
                        guardian_id: checkInObj.db.dbGuardian.id
                      }
                    }).spread(function(dbExecuted, wasCreated){
                      dbQueued.destroy();
                      // should we report some purge request to the guardian on the rtrn obj?
                    }).then(function(dbQueued) {
                      checkInObj.rtrn.obj.received.push({ type: "instructions", id: dbQueued.guid });
                      resolve(checkInObj);
                    });
                  } else {
                    resolve(checkInObj);
                  }
                }).catch(function(err){
                  console.log("failed to update executed instructions | "+err);
                });
              }
            }
          }
        } else {
          resolve(checkInObj);
        }
     } catch (errExecutedInstruction) { console.log(errExecutedInstruction); reject(new Error(errExecutedInstruction)); }
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


