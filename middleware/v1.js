exports.middleware = {

  justPrintSomething: function(req, res, next) {
    console.log("This is being printed by the middleware...");
    next();
  },

}