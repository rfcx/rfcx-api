var util    = require("util"),
    Promise = require("bluebird");

exports.models = {

  guardianAudioEventsJson: function(req,res,dbAudioEvents) {

    if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

    return new Promise(function(resolve,reject) {

      var json = {
        events: []
      };

      for (var i = 0; i < dbAudioEvents.length; i++) {

        var dbRow = dbAudioEvents[i];

        json.events.push({
          event_guid: dbRow.guid,
          audio_guid: dbRow.Audio.guid,
          latitude: dbRow.Audio.Guardian.latitude,
          longitude: dbRow.Audio.Guardian.longitude,
          begins_at: dbRow.begins_at,
          ends_at: dbRow.ends_at,
          type: dbRow.Type.value,
          value: dbRow.Value.value,
          confidence: dbRow.confidence
        });

        resolve(json);
      }
    })

  },

  guardianAudioEventsCSV: function(req,res,dbAudioEvents) {

    if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

    return new Promise(function(resolve,reject) {

      var csv = '';

      for (var i = 0; i < dbAudioEvents.length; i++) {

        var dbRow = dbAudioEvents[i];

      }

      resolve(csv);

    });

  }

};

