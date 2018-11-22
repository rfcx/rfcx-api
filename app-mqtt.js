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

var app = { http: null, mqtt: null };

var mqtt = require("mqtt");

app.mqtt = mqtt.connect({ 
    clientId: "rfcx-api-mqtt-"+process.env.NODE_ENV, 
    host: process.env.MQTT_BROKER_HOST,
    port: 1883,
    protocol: "tcp",
    // username: null,
    // password: null,
    // keyPath: null, // .pem filepath
    // certPath: null, // .pem filepath
    // ca: [ ], // array of .pem filepaths
    // rejectUnauthorized: true,
    protocolId: "MQIsdp", protocolVersion: 3,  
    connectTimeout: 2000, 
    debug: true 
  });


var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var expressWinston = require('express-winston');
var loggers = require("./utils/logger");
var passport = require("passport");
var cors = require("cors");
var bodyParser = require("body-parser");
var multer = require("multer");
var addRequestId = require('express-request-id');
//var addInstanceId = require('./middleware/misc/aws').addInstanceId;
var toobusy = require("toobusy-js");

app.http = express();
app.http.set("title", "rfcx-api-mqtt");
app.http.set("port", process.env.PORT || 8080);
app.http.use(favicon(__dirname + "/public/img/logo/favicon.ico"));
app.http.use(cors());
app.http.use(function(req, res, next) { if (toobusy()) { loggers.errorLogger.log('Server is too busy to handle request', { req: req, info: { url: req.url, body: req.body } }); } next(); });
app.http.use(bodyParser.urlencoded({extended:false}));
app.http.use(bodyParser.json({ limit: '1mb' }));
app.http.use(multer(require("./config/multer").config(process.env)));
app.http.use(passport.initialize());

// app.http.use(express.static(path.join(__dirname, "public")));

// Middleware
app.http.use("/v1/", require("./middleware/v1.js").middleware.setApiParams);
app.http.use("/v1/", require("./middleware/v1.js").middleware.insecureRequestRedirect);

// Guardian Update Endpoints
app.http.use("/v1/guardians", require("./utils/rfcx-mqtt/http/guardians-register"));
//app.http.use("/v1/guardians", require("./utils/rfcx-mqtt/http/guardians-software"));

// Health Check HTTP Endpoint
var healthCheck = require("./utils/rfcx-mqtt/health-check-mqtt.js").healthCheck;
app.http.get("/health_check", function(req,res){ healthCheck.httpResponse(req,res); });


// var mqttInstructions = require("./utils/rfcx-mqtt/mqtt-instructions.js").mqttInstructions;
// app.http.get("/instructions", function(req,res){ 
//   mqttInstructions.sendInstruction(app.mqtt, "3f55b79d5967", "guardian");
//   healthCheck.httpResponse(req,res);
// });

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
  if (status != 404) { loggers.errorLogger.log('Express.js error handler', { req: req, url: req.url, status: status, err: err }); }
  res.status(status).json({ message: err.message, error: err });
});

module.exports = app;
