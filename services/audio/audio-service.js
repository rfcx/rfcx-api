var urlUtil = require("../../utils/misc/urls");
var audioUtils = require("../../utils/rfcx-audio").audioUtils;

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

function serveAudioFromS3(res, filename, s3Bucket, s3Path) {

  var audioStorageUrl = `s3://${s3Bucket}/${s3Path}/${filename}`;

  return audioUtils.cacheSourceAudio(audioStorageUrl)
    .then(({ sourceFilePath, headers }) => {
      audioUtils.serveAudioFromFile(res, sourceFilePath, filename, (headers? headers['content-type'] : null))
    });

}

module.exports = {
  getGuidsFromDbAudios,
  combineAssetsUrls,
  serveAudioFromS3,
};
