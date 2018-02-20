// check for environmental variable file and load if present
var fs = require("fs");
if (fs.existsSync("./config/env_vars.js")) {
  var env = require("./config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

// New Relic Initialization
if (process.env.NODE_ENV === "production") {
  process.env.NEW_RELIC_HOME = __dirname+"/config"; require("newrelic");
}

var express = require("express"),
    path = require("path"),
    favicon = require("serve-favicon");
 // var expressWinston = require('express-winston');
var loggers = require('./utils/logger');
//var multer = require("multer"),
//  passport = require("passport"),
//  cors = require("cors"),
  // bodyParser = require("body-parser"),
// var addRequestId = require('express-request-id');
// var addInstanceId = require('./middleware/misc/aws').addInstanceId;
var toobusy = require('toobusy-js');
var app = express();

app.set("title", "rfcx-api-mqtt");
app.set("port", process.env.PORT || 8080);
//app.use(addInstanceId);
app.use(favicon(__dirname + "/public/img/logo/favicon.ico"));
app.use(function(req, res, next) { if (toobusy()) { loggers.errorLogger.log('Server is too busy to handle request', { req: req, info: { url: req.url, body: req.body } }); } next(); });
app.use(express.static(path.join(__dirname, "public")));

// Health Check HTTP Endpoint
var healthCheck = require("./utils/internal-rfcx/health-check.js").healthCheck;
app.get("/health_check", function(req,res){ healthCheck.httpResponse(req,res); });

// Default HTTP Endpoint
app.get('/',function(req,res){
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication (mqtt). Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  });
});

// Catch & Report Various HTTP Errors (needs some work)
app.use(function(req, res, next) { var err = new Error('Not Found'); err.status = 404; next(err); });
app.use(function(err, req, res, next) {
  var status = err.status || 500;
  loggers.errorLogger.log('Express.js error handler', { req: req, url: req.url, status: status, err: err });
  res.status(status).json({ message: err.message, error: err });
});

module.exports = app;
