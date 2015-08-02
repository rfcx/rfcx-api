var path = require("path");

exports.middleware = {

  emptyMiddleware: function(req, res, next) {
    next();
  },
    
  setApiParams: function(req, res, next) {

    var apiUrl = ((req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol)+"://"+req.headers.host;
    var rtrnCount = (req.query.count == null) ? 1 : parseInt(req.query.count);
    var rtrnOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset);

    var contentType = path.extname(req.path).trim().substr(1);
    if (contentType.trim().length == 0) { contentType = "json"; }
    req.url = req.url.replace("."+contentType,"");

    req.rfcx = {
      api_url: apiUrl,
      count: rtrnCount,
      offset: rtrnOffset,
      content_type: contentType
    };

    next();
  },

}