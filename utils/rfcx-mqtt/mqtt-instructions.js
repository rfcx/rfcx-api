var Promise = require('bluebird');
var mqttPublish = require("../../utils/rfcx-mqtt/mqtt-publish.js").mqttPublish;

 var mqttInstructions = {




  updateAndDispatchGuardianInstructions: function(checkInObj) {

    // arrays of return values for checkin response json
    var instrRtrnArrayQueued = [];

    let promsReceived = [];
    // Update executed Instruction info in database
    if ((checkInObj.json.instructions != null) && (checkInObj.json.instructions.received != null)) {
      for (var i = 0; i < checkInObj.json.instructions.received.length; i++) {
        let prom = models.GuardianMetaInstructionsQueue.findOne({
          where: {
            guid: checkInObj.json.instructions.received[i].guid,
            guardian_id: checkInObj.db.dbGuardian.id,
            received_at: null
          }
        })
        .then((dbQueueEntry) => {
          if (dbQueueEntry != null) {
            dbQueueEntry.received_at = new Date(parseInt(checkInObj.json.instructions.received[i].received_at));
            dbQueueEntry.save();
          }
        });
        promsReceived.push(prom);
      }
    }



    return Promise.all(promsReceived)
      .then(() => {









        // // parse list of purged assets from guardian, delete them from database and return list
        // var dbMetaPurgedAssets = [], metaPurgedAssets = strArrToJSArr(checkInObj.json.assets_purged,"|","*");
        // for (asstInd in metaPurgedAssets) {
        //   if (metaPurgedAssets[asstInd][1] != null) {
        //     dbMetaPurgedAssets.push({
        //       guardian_id: guardianId,
        //       asset_type: metaPurgedAssets[asstInd][0],
        //       asset_id: metaPurgedAssets[asstInd][1]
        //     });
        //     purgedReturnArray.push({ type: metaPurgedAssets[asstInd][0], id: metaPurgedAssets[asstInd][1] });
        //   }
        // }
        // parse list of audio ids marked as 'sent' by guardian, confirm that they are present in exchange log table
        //   let promsExchLogs = [];
        // // if (checkInObj.json.checkins_to_verify != null) {
        // //   for (var i = 0; i < checkInObj.json.checkins_to_verify.length; i++) {
        // //     let prom = models.GuardianMetaAssetExchangeLog.findOne({
        // //         where: {
        // //           guardian_id: guardianId,
        // //           asset_type: "audio",
        // //           asset_id: checkInObj.json.checkins_to_verify[i]
        // //         }
        // //       })
        // //       .then((dbAssetEntry) => {
        // //         if (dbAssetEntry != null) {
        // //           receivedReturnArray.push({ type: "audio", id: dbAssetEntry.asset_id });
        // //         }
        // //       });
        // //     promsExchLogs.push(prom);
        // //   }
        // // }

        // return Promise.all(promsExchLogs)
        //   .then(() => {
        //     // if (dbMetaPurgedAssets.length > 0) {
        //     //   let proms = dbMetaPurgedAssets.map((item) => {
        //     //     return models.GuardianMetaAssetExchangeLog.destroy({ where: item })
        //     //   });
        //     //   return Promise.all(proms);
        //     // }
        //     // else {
        //       return Promise.all(promsExchLogs);
        //   //  }
        //   })
      })
      .then(() => {

        // instrRtrnArrayQueued.push({ 
        //       guid: "13818352-8061-440e-849b-52d700e33dc0", 
        //       type: "control", 
        //       command: "sms_queue", 
        //       execute_at: "0", 
        //       meta: { 
        //         address: "asdf", 
        //         body: "asdf" 
        //       } 
        //   });

        // add instruction array to overall checkInObj
        checkInObj.rtrn.obj.instructions = instrRtrnArrayQueued;

        return checkInObj;
      })

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

exports.mqttInstructions = mqttInstructions;


