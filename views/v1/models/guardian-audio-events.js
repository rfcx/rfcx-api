var util    = require("util"),
    Promise = require("bluebird");

exports.models = {

  guardianAudioEventsJson: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var json = {
          events: []
        };

        for (var i = 0; i < dbAudioEvents.length; i++) {

          var dbRow = dbAudioEvents[i];

          json.events.push({
            event_guid: dbRow.guid,
            audio_guid: dbRow.Audio.guid,
            meta_url: process.env.ASSET_URLBASE + "/audio/" + dbRow.Audio.guid,
            latitude: dbRow.shadow_latitude,
            longitude: dbRow.shadow_longitude,
            begins_at: dbRow.begins_at,
            ends_at: dbRow.ends_at,
            type: dbRow.Type.value,
            value: dbRow.Value.value,
            confidence: dbRow.confidence
          });

        }

        resolve(json);

      }
      catch (err) {
        reject(err);
      }

    })

  },

  guardianAudioEventsCSV: function(req,res,dbAudioEvents) {

    return new Promise(function(resolve,reject) {

      try {

        if (!util.isArray(dbAudioEvents)) { dbAudioEvents = [dbAudioEvents]; }

        var csv = 'event_guid,audio_guid,latitude,longitude,begins_at,ends_at,type,value,confidence\r\n';

        for (var i = 0; i < dbAudioEvents.length; i++) {

          var dbRow = dbAudioEvents[i];

          csv += dbRow.guid + ',';
          csv += dbRow.Audio.guid + ',';
          csv += dbRow.shadow_latitude + ',';
          csv += dbRow.shadow_longitude + ',';
          csv += dbRow.begins_at.toISOString() + ',';
          csv += dbRow.ends_at.toISOString() + ',';
          csv += dbRow.Type.value + ',';
          csv += dbRow.Value.value + ',';
          csv += dbRow.confidence + '\r\n';

        }

        resolve(csv);

      }
      catch (err) {
        reject(err);
      }

    });

  }

};

