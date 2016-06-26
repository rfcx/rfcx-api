var Promise = require("bluebird");

var urls = require("../../../utils/misc/urls");

exports.models = {

  DataFilterAudioGuidToJson: function(req,res,guids) {
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

          result.data.attributes.audio = guids.map(function (obj) {
              return {
                  guid: obj.guid,
                  link: urls.getAudioUrl(req, obj.guid),
                  labels: urls.getAudioUrl(req, obj.guid) + '/labels'
              }
          });

          resolve(result);
      });
  }


};

