var Promise = require("bluebird");
var urls = require("../../../utils/misc/urls");

exports.models = {

  groupTagsByCreator: function(req, res, dbRows) {

    var result = {
      data: {
        type: "tags",
        attributes: {
          windows: {}
        }
      },
      links: {
        self: urls.getApiUrl(req) + '/tags' + req.url
      }
    };

    return new Promise(function (resolve, reject) {

      try {
        dbRows.forEach(function(row) {
          if (!result.data.attributes.windows[row.begins_at_offset]) {
            result.data.attributes.windows[row.begins_at_offset] = [];
          }
          result.data.attributes.windows[row.begins_at_offset].push({
            endsAt: row.ends_at_offset,
            duration: row.ends_at_offset - row.begins_at_offset,
            confidence: row.confidence,
            name: row.annotator,
            annotatorType: row.user? 'user' : row.model? 'model' : 'unknown'
          });
        });
        resolve(result);
      }
      catch (err) {
        console.log('Error in process of grouping tags for audio file |', err);
        reject(new Error(err));
      }

    });

  },

  countTagsByGuid: function(req, res, dbRows) {

    return new Promise(function (resolve, reject) {

      try {

        var json = {};

        var inputGuids = req.body.audios;

        // set classified attribute to false by default for all input guids
        inputGuids.forEach(function(guid) {
          json[guid] = [];
        });

        // change classified to true for guids which has tags
        dbRows.forEach(function(row) {
          var guid = row.guid;
          json[guid].push({
            begins_at_offset: row.begins_at_offset,
            ends_at_offset: row.ends_at_offset,
            confidence: row.confidence
          });
        });

        resolve(json);

      }
      catch (err) {
        console.log('Error in process of counting tags for audio files |', err);
        reject(new Error(err));
      }

    });

  }

};