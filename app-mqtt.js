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

var express = require("express"), path = require("path"), favicon = require("serve-favicon"), loggers = require('./utils/logger'), toobusy = require('toobusy-js'), mqtt = require("mqtt");
var app = { http: express(), mqtt: null };



app.mqtt = mqtt.connect( "tcp://mqtt.rfcx.org", { clientId: "rfcx-api-mqtt", protocolId: "MQIsdp",  protocolVersion: 3,  connectTimeout: 1000, debug: true });




















app.http.set("title", "rfcx-api-mqtt");
app.http.set("port", process.env.PORT || 8080);
app.http.use(favicon(__dirname + "/public/img/logo/favicon.ico"));
app.http.use(function(req, res, next) { if (toobusy()) { loggers.errorLogger.log('Server is too busy to handle request', { req: req, info: { url: req.url, body: req.body } }); } next(); });
app.http.use(express.static(path.join(__dirname, "public")));

// Health Check HTTP Endpoint
var healthCheck = require("./utils/internal-rfcx/health-check.js").healthCheck;
app.http.get("/health_check", function(req,res){ healthCheck.httpResponse(req,res); });

// Default HTTP Endpoint
app.http.get('/',function(req,res){
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication (mqtt). Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  });
});

// Catch & Report Various HTTP Errors (needs some work)
app.http.use(function(req, res, next) { var err = new Error('Not Found'); err.status = 404; next(err); });
app.http.use(function(err, req, res, next) {
  var status = err.status || 500;
  loggers.errorLogger.log('Express.js error handler', { req: req, url: req.url, status: status, err: err });
  res.status(status).json({ message: err.message, error: err });
});




















module.exports = app;
