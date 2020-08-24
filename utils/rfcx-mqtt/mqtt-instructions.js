var Promise = require('bluebird');
var models  = require("../../models");
var util = require("util");
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;

exports.mqttInstructions = {

  updateReceivedGuardianInstructions: function(checkInObj) {
    return new Promise(function(resolve,reject){
      try {
        if (checkInObj.instructions == null) { checkInObj.instructions = {}; };
        if ((checkInObj.json.instructions != null) && (checkInObj.json.instructions.received != null)) {
          if (checkInObj.json.instructions.received.length == 0) {
            resolve(checkInObj);
          } else {
            for (var i = 0; i < checkInObj.json.instructions.received.length; i++) {
              if (checkInObj.json.instructions.received[i].id != null) {

                // cache instruction info
                var recId = checkInObj.json.instructions.received[i].id;
                if (checkInObj.instructions[recId] == null) { checkInObj.instructions[recId] = {}; };
                checkInObj.instructions[recId].received_at = new Date(parseInt(checkInObj.json.instructions.received[i].received_at));

                models.GuardianMetaInstructionsQueue.findOne({
                  where: {
                    id: recId,
                    guardian_id: checkInObj.db.dbGuardian.id,
                    received_at: null
                  }
                }).then(function(dbQueued){
                  if (dbQueued != null) {
                    dbQueued.received_at = checkInObj.instructions[dbQueued.id].received_at;
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
              if (checkInObj.json.instructions.executed[i].id != null) {

                // cache instruction info
                var execId = checkInObj.json.instructions.executed[i].id;
                if (checkInObj.instructions[execId] == null) { checkInObj.instructions[execId] = {}; };
                checkInObj.instructions[execId].executed_at = new Date(parseInt(checkInObj.json.instructions.executed[i].executed_at));
                checkInObj.instructions[execId].received_at = new Date(parseInt(checkInObj.json.instructions.executed[i].received_at));
                checkInObj.instructions[execId].response = checkInObj.json.instructions.executed[i].response;
                checkInObj.instructions[execId].execution_attempts = parseInt(checkInObj.json.instructions.executed[i].attempts);
            
                models.GuardianMetaInstructionsLog.findOrCreate({
                  where: {
                    instr_id: execId,
                    executed_at: checkInObj.instructions[execId].executed_at,
                    received_at: checkInObj.instructions[execId].received_at,
                    response_json: checkInObj.instructions[execId].response,
                    execution_attempts: checkInObj.instructions[execId].execution_attempts,
                    guardian_id: checkInObj.db.dbGuardian.id
                  }
                }).spread(function(dbExecuted, wasCreated){

                  checkInObj.rtrn.obj.received.push({ type: "instruction", id: dbExecuted.instr_id });

                  models.GuardianMetaInstructionsQueue.findOne({
                    where: {
                      id: dbExecuted.instr_id,
                      guardian_id: checkInObj.db.dbGuardian.id
                    }
                  }).then(function(dbQueued){

                    if (dbQueued != null) {
                      dbExecuted.queued_at = dbQueued.queued_at;
                      dbExecuted.type = dbQueued.type;
                      dbExecuted.command = dbQueued.command;
                      dbExecuted.meta_json = dbQueued.meta_json;
                      dbExecuted.dispatch_attempts = dbQueued.dispatch_attempts;
                      dbExecuted.save();
                      
                      dbQueued.destroy();

                      resolve(checkInObj);
                    } else {
                      resolve(checkInObj);
                    }

                  }).catch(function(err){
                    console.log("failed to update executed instructions | "+err);
                  });
                  
                  // should we report some purge request to the guardian on the rtrn obj?
                }).then(function(dbExecuted) {
                  resolve(checkInObj);
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

        var rtrnInstructions = [], blockedInstructions = [];
        if (checkInObj.json.instructions != null) {
          if ((checkInObj.json.instructions.received != null) && (checkInObj.json.instructions.received.length > 0)) {
            for (var i = 0; i < checkInObj.json.instructions.received.length; i++) {
              if (checkInObj.json.instructions.received[i].id != null) {
                blockedInstructions.push(checkInObj.json.instructions.received[i].id);
          } } }
          if ((checkInObj.json.instructions.executed != null) && (checkInObj.json.instructions.executed.length > 0)) {
            for (var i = 0; i < checkInObj.json.instructions.executed.length; i++) {
              if (checkInObj.json.instructions.executed[i].id != null) {
                blockedInstructions.push(checkInObj.json.instructions.executed[i].id);
          } } }
        }
        
        models.GuardianMetaInstructionsQueue
            .findAll({
              where: { guardian_id: checkInObj.db.dbGuardian.id, received_at: null },
              order: [ ["created_at", "ASC"] ]
          }).then(function(dbQueued){

            if (dbQueued != null) {
              for (dbQuInd in dbQueued) {
                if ((dbQueued[dbQuInd].id != null) && (blockedInstructions.indexOf(dbQueued[dbQuInd].id) < 0)) {

                  rtrnInstructions.push({
                    id: dbQueued[dbQuInd].id,
                    type: dbQueued[dbQuInd].type,
                    cmd: dbQueued[dbQuInd].command,
                    meta: ""+((dbQueued[dbQuInd].meta_json == null) ? "" : dbQueued[dbQuInd].meta_json),
                    at: ""+((dbQueued[dbQuInd].execute_at == null) ? "" : dbQueued[dbQuInd].execute_at.valueOf())
                  });

                  dbQueued[dbQuInd].dispatch_attempts = dbQueued[dbQuInd].dispatch_attempts+1;
                  dbQueued[dbQuInd].save();

                }
              }
              
              checkInObj.rtrn.obj.instructions = rtrnInstructions;
              
            }
            resolve(checkInObj);

          }).catch(function(err){
            console.log("failed to return queued instructions | "+err);
          });
     } catch (errUpdateInstruction) { console.log(errUpdateInstruction); reject(new Error(errUpdateInstruction)); }
    }.bind(this));
  }


};



