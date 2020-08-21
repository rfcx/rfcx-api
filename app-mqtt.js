// various process-related stuff
require('./utils/process');

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

// check that all required env vars are set
require('./config/inspector');

var app = { http: null, mqtt: null };

var mqtt = require("mqtt");

app.mqtt = mqtt.connect({
    clientId: "rfcx-api-mqtt-development" + process.env.NODE_ENV + Math.random().toString(16).substr(2, 8),
    host: process.env.MQTT_BROKER_HOST,
    port: process.env.MQTT_BROKER_PORT,
    protocol: "tcp",
    username: process.env.MQTT_BROKER_USER,
    password: process.env.MQTT_BROKER_PASSWORD,
    // keyPath: null, // .pem filepath
    // certPath: null, // .pem filepath
    // ca: [ ], // array of .pem filepaths
    // rejectUnauthorized: true,
    protocolId: "MQIsdp",
    protocolVersion: 3,
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
const packageData = require('./package.json');

app.http = express();
app.http.set("title", "rfcx-api-mqtt");
app.http.set("port", process.env.PORT || 8080);
app.http.use(favicon(__dirname + "/public/img/logo/favicon.ico"));
app.http.use(cors());
app.http.use(require('./middleware/toobusy'))
app.http.use(bodyParser.urlencoded({ extended: false }));
app.http.use(bodyParser.json({ limit: '1mb' }));
app.http.use(multer(require("./config/multer").config(process.env)));
app.http.use(passport.initialize());

const routeMiddleware = require('./middleware/route')

// Enable documentation
app.http.use('/docs', require('./docs/mqtt'))
// Default and health check routes
app.http.use(require('./routes/info'))
// RabbitMQ specific endpoints
app.http.use('/internal/rabbitmq', require('./routes/internal/rabbitmq'));

// Catch errors
const { notFound, exceptionOccurred } = require('./middleware/error')
app.http.use(notFound) // Last route, catches all
app.http.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app;
