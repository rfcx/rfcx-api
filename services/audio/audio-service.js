// var Converter = require("../../utils/converter/converter");
// var models = require("../../models");
// var views = require("../../views/v1");
// var Promise = require("bluebird");
var urlUtil = require("../../utils/misc/urls");

function getGuidsFromDbAudios(dbAudios) {
  return dbAudios.map((audio) => {
    return audio.guid;
  });
}

function combineAssetsUrls(req, guids, extension) {
  return guids.map((guid) => {
    return urlUtil.getAudioAssetsUrl(req, guid, extension);
  });
}

module.exports = {
  getGuidsFromDbAudios: getGuidsFromDbAudios,
  combineAssetsUrls: combineAssetsUrls
};
