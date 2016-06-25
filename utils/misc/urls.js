
function getApiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

function getAudioUrl(req, guid) {
    return getApiUrl(req) + '/audio/' + guid;
}
module.exports = {
    getApiUrl: getApiUrl,
    getAudioUrl: getAudioUrl
};
