var Promise = require("bluebird");

var urls = require("../../../utils/misc/urls");

exports.models = {

  DataFilterAudioGuidToJson: function(req,res,data) {

    function convertLabelsToRows(labels) {

      var rows = {};
      labels.forEach(function(label) {
        var guid = label.guid,
          duration = label.duration;
        // extract all audio guids
        if (rows[guid] === undefined) {
          rows[guid] = {};
        }
        // exctract all window durations for each audio guid
        if (rows[guid][duration] === undefined) {
          rows[guid][duration] = {};
        }
        // save current label into proper audio, duration and offset values
        rows[guid][duration][label.begins_at_offset] = label.confidence;
      });

      // go through all saved labels and fill empty offsets with zeroes
      for (var guid in rows) {
        if (rows.hasOwnProperty(guid)) {
          for (var duration in rows[guid]) {
            if (rows[guid].hasOwnProperty(duration)) {
              var obj = rows[guid][duration];
              // get maximum begins_at_offset value - this will be the maximum for our loop
              var maxBeginsAtOffset = Math.max.apply(null, Object.keys(obj));
              // iterate through all labels for our current audio guid and duration value using max begins_at_offset and duration
              for (var i = 0; i < maxBeginsAtOffset; i+= parseInt(duration)) {
                // if confidence is missed for some of offsets, fill them with zero
                if (obj[i] === undefined) {
                  console.log('GuardianAudioTag for audio', guid, 'is undefined at offset ===', i, 'with duration',
                    duration, '. Set it to zero.');
                  obj[i] = 0;
                }
              }
              // transform objects to integers
              rows[guid][duration] = Object.keys(obj).map(function(key) {
                return obj[key];
              });
            }
          }
        }
      }
      return rows;
    }

    return new Promise(function (resolve, reject) {
      var result = {
          data: {
              type: "datafilter",
              attributes: {}
          },
          links: {
              self: urls.getApiUrl(req) + '/datafilters' + req.url
          }
      };

      result.data.attributes.audio = data.guids.map(function (obj) {
          return {
              guid: obj.guid,
              audio_id: obj.audio_id,
              link: urls.getAudioUrl(req, obj.guid),
              labels: urls.getAudioUrl(req, obj.guid) + '/labels'
          }
      });

      if (data.labels) {
        result.data.attributes.labels = convertLabelsToRows(data.labels);
      }

      resolve(result);
      });
  }


};

