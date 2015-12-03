var Promise = require("bluebird");
var zlib = require("zlib");

exports.gzip = {

  unZipJson: function(gZippedJson) {
    return new Promise(function(resolve, reject) {
        try {
          models.GuardianMetaMessage.create({
              guardian_id: message.guardian_id,
              check_in_id: message.checkin_id,
              received_at: message.timeStamp,
              address: message.address,
              body: message.body,
              android_id: message.android_id
            }).then(function(dbGuardianMetaMessage){
              resolve(dbGuardianMetaMessage);
              console.log("message saved: "+dbGuardianMetaMessage.guid);
            }).catch(function(err){
              console.log("error saving message: "+message.android_id+", "+message.body+", "+err);
              reject(new Error(err));
            });
        } catch(err) {
            console.log(err);
            reject(new Error(err));
        }
    }.bind(this));
  }

};

