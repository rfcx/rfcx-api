var path = require("path");

exports.middleware = {

  emptyMiddleware: function(req, res, next) {
    next();
  },
    
  setApiParams: function(req, res, next) {

    var apiUrl = ((req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol)+"://"+req.headers.host;
    var paramCount = (req.query.count == null) ? 1 : parseInt(req.query.count);
    var paramOffset = (req.query.offset == null) ? 0 : parseInt(req.query.offset);

    var paramDateStart = (req.query.start == null) ? null : (new Date(""+req.query.start));
    var paramDateEnd = (req.query.end == null) ? null : (new Date(""+req.query.end));

    var contentType = path.extname(req.path).trim().substr(1);    
    if (contentType.trim().length == 0) { contentType = "json"; }
    req.url = req.url.replace("."+contentType,"");

    console.log(req.headers);

    req.rfcx = {
      api_url: apiUrl,
      count: paramCount,
      offset: paramOffset,
      date_start: paramDateStart,
      date_end: paramDateEnd,
      content_type: contentType
    };

    next();
  },

}