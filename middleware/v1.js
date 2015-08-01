exports.middleware = {

  emptyMiddleware: function(req, res, next) {
    next();
  },
    
  setApiUrl: function(req, res, next) {
    var protocol = (req.headers["x-forwarded-proto"] != null) ? req.headers["x-forwarded-proto"] : req.protocol;
    process.env.apiUrl = protocol+"://"+req.headers.host;
    next();
  },

}