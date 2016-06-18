
function getApiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/v1';
}

module.exports = {
    getApiUrl: getApiUrl
};
