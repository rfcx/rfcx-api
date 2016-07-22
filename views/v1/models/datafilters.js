var Promise = require("bluebird");

var urls = require("../../../utils/misc/urls");

exports.models = {

  DataFilterAudioGuidToJson: function(req,res,data) {

    function convertLabelsToRows(labels) {
      var rows = {};
      for (var i = 0; i < labels.length; i++) {
        var item = labels[i];
        if (!rows[item.guid]) {
          rows[item.guid] = [];
        }
        rows[item.guid].push(item.confidence);
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

