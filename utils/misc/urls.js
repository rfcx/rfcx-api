
function getBaseUrl(req) {
  return req.protocol + '://' + req.get('host');
}

function getApiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

function getAudioUrl(req, guid) {
    return getApiUrl(req) + '/audio/' + guid;
}

function getAudioAssetsUrl(req, guid, extension) {
    return getApiUrl(req) + '/assets/audio/' + guid + '.' + extension;
}

module.exports = {
    getBaseUrl: getBaseUrl,
    getApiUrl: getApiUrl,
    getAudioUrl: getAudioUrl,
    getAudioAssetsUrl: getAudioAssetsUrl
};
