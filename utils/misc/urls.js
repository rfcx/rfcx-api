
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
    return `${getApiUrl(req)}/assets/audio/${guid}.${extension}`;
}

function getSpectrogramAssetsUrl(req, guid, extension) {
    return `${getApiUrl(req)}/assets/audio/${guid}.png`;
}

function getAmplitudeAssetsUrl(req, guid) {
    return `${getApiUrl(req)}/assets/audio/amplitude/${guid}.json`;
}

module.exports = {
    getBaseUrl,
    getApiUrl,
    getAudioUrl,
    getSpectrogramUrl,
    getAudioAssetsUrl,
    getSpectrogramAssetsUrl,
    getAmplitudeAssetsUrl
};
