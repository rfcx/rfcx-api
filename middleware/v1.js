var path = require("path");
var url = require("url");

exports.middleware = {

  emptyMiddleware: function(req, res, next) {
    next();
  },
    
  setApiParams: function(req, res, next) {

    var apiUrl = ((req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol)+"://"+req.headers.host;
    var paramCount = (req.query.count == null) ? 1 : parseInt(req.query.count);
    var paramOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset);

    var paramBefore = (req.query.before_timestamp == null) ? null : (new Date(""+req.query.before_timestamp));
    var paramAfter = (req.query.after_timestamp == null) ? null : (new Date(""+req.query.after_timestamp));

    var contentType = path.extname(req.path).trim().substr(1);    
    if (contentType.trim().length == 0) { contentType = "json"; }
    var urlPath = "/v1"+url.parse(req.url).pathname;
    req.url = req.url.replace("."+contentType,"");

    var authUser = { header: null, query: null, body: null };
    if (req.headers["x-auth-user"] != null) { authUser.header = req.headers["x-auth-user"]; }
    if (req.query["auth_user"] != null) { authUser.query = req.query["auth_user"]; }
    if (req.body["auth_user"] != null) { authUser.body = req.body["auth_user"]; }

    var apiVersion = { header: null, query: null, body: null };
    if (req.headers["x-rfcx-version"] != null) { apiVersion.header = req.headers["x-rfcx-version"]; }
    if (req.query["rfcx_version"] != null) { apiVersion.query = req.query["rfcx_version"]; }
    if (req.body["rfcx_version"] != null) { apiVersion.body = req.body["rfcx_version"]; }

    req.rfcx = {
      api_url: apiUrl,
      api_version: apiVersion,
      url_path: urlPath,
      count: paramCount,
      offset: paramOffset,
      before_timestamp: paramBefore,
      after_timestamp: paramAfter,
      content_type: contentType,
      auth_user: authUser
    };

    next();
  },

}