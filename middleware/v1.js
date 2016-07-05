var path = require("path");
var url = require("url");

exports.middleware = {
    
  setApiParams: function(req, res, next) {

    var requestStartTime = (new Date()).valueOf();

    var apiUrlProtocol = ((req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol);
    var apiUrlDomain = apiUrlProtocol+"://"+req.headers.host;
    
    var paramLimit = (req.query.limit == null) ? 20 : parseInt(req.query.limit);
    if (paramLimit > 1000) { paramLimit = 1000; } else if (paramLimit < 1) { paramLimit = 1; }

    var paramOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset);

    var paramAfter = (req.query.starting_after == null) ? null : (isNaN(Number(req.query.starting_after))) ? (new Date(""+req.query.starting_after)) : (new Date(parseInt(req.query.starting_after)));
    var paramBefore = (req.query.ending_before == null) ? null : (isNaN(Number(req.query.ending_before))) ? (new Date(""+req.query.ending_before)) : (new Date(parseInt(req.query.ending_before)));
    var fallbackDurationInMinutes = 60;
    if ((paramAfter != null) && (paramBefore == null)) { paramBefore = new Date(paramAfter.valueOf()+fallbackDurationInMinutes*60*1000); }
    if ((paramBefore != null) && (paramAfter == null)) { paramAfter = new Date(paramBefore.valueOf()-fallbackDurationInMinutes*60*1000); }

    var paramOrder = (req.query.order == null) ? null : ((req.query.order.toLowerCase() == "ascending") ? "ASC" : "DESC");

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
      request_start_time: requestStartTime,
      api_url_protocol: apiUrlProtocol,
      api_url_domain: apiUrlDomain,
      api_version: apiVersion,
      url_path: urlPath,
      limit: paramLimit,
      offset: paramOffset,
      starting_after: paramAfter,
      ending_before: paramBefore,
      order: paramOrder,
      content_type: contentType.toLowerCase(),
      auth_user: authUser
    };

    next();
  },

  insecureRequestRedirect: function(req, res, next) {

    var allowedOverInsecureConnection = [ "rf.cx" ];

    if (    ((process.env.NODE_ENV === "production") || (process.env.NODE_ENV === "staging")) 
        &&  (req.rfcx.api_url_protocol === "http")
        &&  (allowedOverInsecureConnection.indexOf(req.headers.host) < 0)
        ) {
          res.redirect("https://"+req.headers.host+req.rfcx.url_path);
    } else {

      next();
    }
  
  }

}