
function getBaseUrl(req) {
  return req.protocol + '://' + req.get('host');
}

function getApiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

function getAudioUrl(req, guid) {
    return getApiUrl(req) + '/audio/' + guid;
}
module.exports = {
    getBaseUrl: getBaseUrl,
    getApiUrl: getApiUrl,
    getAudioUrl: getAudioUrl
};
