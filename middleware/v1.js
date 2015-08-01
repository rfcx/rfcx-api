exports.middleware = {

  emptyMiddleware: function(req, res, next) {
    next();
  },
    
  setApiParams: function(req, res, next) {

    var apiUrl = ((req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol)+"://"+req.headers.host;
    var contentType = ((req.path.lastIndexOf(".") >= 0) ? req.path.substr(1+req.path.lastIndexOf(".")) : "json");

    var rtrnCount = (req.query.count == null) ? 1 : parseInt(req.query.count);
    var rtrnOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset);

    req.rfcx = {
      api_url: apiUrl,
      count: rtrnCount,
      offset: rtrnOffset,
      content_type: contentType
    };

    next();
  },

}