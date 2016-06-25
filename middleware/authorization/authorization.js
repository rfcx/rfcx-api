var httpError = require('../../utils/http-errors');

// Factory method to create a token type authorization middleware
function requireTokenType(type) {
    // curry
    return function (req, res, next) {
        if(req.rfcx.auth_token_info.type != type) {
            httpError(res, 403, "token");
            req.end();
        } else {
            next();
        }
    };
}



module.exports = {
    requireTokenType: requireTokenType
};