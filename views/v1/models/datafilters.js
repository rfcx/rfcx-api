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

