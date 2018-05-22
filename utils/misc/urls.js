
function getBaseUrl(req) {
  return req.protocol + '://' + req.get('host');
}

function getApiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

function getAudioUrl(req, guid, extension) {
    return `${getApiUrl(req)}/audio/${guid}.${extension}`;
}

function getSpectrogramUrl(req, guid) {
    return `${getApiUrl(req)}/audio/${guid}.png`;
}

function getAudioAssetsUrl(req, guid, extension) {
    return getApiUrl(req) + '/assets/audio/' + guid + '.' + extension;
}

module.exports = {
    getBaseUrl: getBaseUrl,
    getApiUrl: getApiUrl,
    getAudioUrl: getAudioUrl,
    getSpectrogramUrl: getSpectrogramUrl,
    getAudioAssetsUrl: getAudioAssetsUrl
};
