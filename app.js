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
    favicon = require("serve-favicon"),
    expressWinston = require('express-winston');
    loggers = require('./utils/logger');
    multer = require("multer"),
    passport = require("passport"),
    cors = require("cors"),
    bodyParser = require("body-parser"),
    addRequestId = require('express-request-id'),
    addInstanceId = require('./middleware/misc/aws').addInstanceId,
    toobusy = require('toobusy-js'),
    app = express();

app.set("title", "rfcx-api");
app.set("port", process.env.PORT || 8080);
app.use(addRequestId({
  attributeName: 'guid'
}));
app.use(addInstanceId);
app.use(favicon(__dirname + "/public/img/logo/favicon.ico"));
app.use(cors()); // TO-DO: Currently enables CORS for all requests. We may have a reason to limit this in the future...
app.use(expressWinston.logger({
  winstonInstance: loggers.expressLogger,
  expressFormat: true,
  level: 'info',
  requestWhitelist: ['guid', 'instance', 'url', 'headers', 'method', 'httpVersion', 'originalUrl', 'query', 'body', 'files'],
  requestFilter: function(req, propName) {
    if (propName === 'headers') {
      // remove user token from logging for security reasons
      delete req.headers['x-auth-token'];
    }
    if (propName === 'body') {
      // delete password from login body
      delete req.body.password;
    }
    return req[propName];
  },
  ignoreRoute: function(req) {
    if (req.url === '/health_check') return true;
    return false;
  },
}))
app.use(function(req, res, next) {
  if (toobusy()) {
    loggers.errorLogger.log('Server is too busy to handle request', { req: req, info: {
      url: req.url,
      body: req.body
    }});
  }
  next();
});
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(multer(require("./config/multer").config(process.env)));
app.use(express.static(path.join(__dirname, "public")));
app.use(passport.initialize());

// Define/Load Routes
var routes = {
  "v1": {
    "guardians": [
      require("./routes/v1/guardians/guardians-groups"),
      require("./routes/v1/guardians/guardians"),
      require("./routes/v1/guardians/guardians-software"),
      require("./routes/v1/guardians/guardians-checkins"),
      require("./routes/v1/guardians/guardians-audio"),
      require("./routes/v1/guardians/guardians-audio-analysis"),
      require("./routes/v1/guardians/guardians-audio-uploads"),
      require("./routes/v1/guardians/guardians-events"),
      require("./routes/v1/guardians/guardians-meta"),
      require("./routes/v1/guardians/guardians-screenshots"),
      require("./routes/v1/guardians/guardians-status"),
      require("./routes/v1/guardians/guardians-coverage"),
    ],
    "sites": [
      require("./routes/v1/sites/sites"),
      require("./routes/v1/sites/sites-audio"),
      require("./routes/v1/sites/sites-guardians"),
      require("./routes/v1/sites/sites-events"),
      require("./routes/v1/sites/sites-images"),
    ],
    "audio": [
      require("./routes/v1/audio/audio"),
      require("./routes/v1/audio/audio-collections"),
      require("./routes/v1/audio/audio-tags"),
    ],
    "analysis": [
      require("./routes/v1/analysis/analysis"),
      require("./routes/v1/analysis/audio-analysis-training-set"),
    ],
    "users": [
      require("./routes/v1/users/users"),
    ],
    "events": [
      require("./routes/v1/events/events"),
    ],
    "shortlinks": [
      require("./routes/v1/shortlinks/shortlinks"),
    ],
    "player": [
      require("./routes/v1/player/player"),
    ],
    "assets": [
      require("./routes/v1/assets/assets"),
    ],
    "reports": [
      require("./routes/v1/reports/reports"),
    ],
    "tags": [
      require("./routes/v1/tags/tags"),
    ],
    "datafilters": [
      require("./routes/v1/datafilters/datafilters"),
    ],
    "sensations": [
      require("./routes/v1/sensations/sensations"),
    ],
    "perceptions": [
      require("./routes/v1/perceptions/perceptions-ai"),
    ],
    "messages": [
      require("./routes/v1/messages/messages"),
    ],
    "filter-presets": [
      require("./routes/v1/filter-presets/filter-presets"),
    ],
    "metrics": [
      require("./routes/v1/metrics/metrics"),
    ],
    "adopt-protect": [
      require("./routes/v1/adopt-protect/donations"),
    ],
    "forms": [
      require("./routes/v1/forms/contact"),
    ],
    "pdf": [
      require("./routes/v1/pdf/pdf"),
    ],
  },
  v2: {
    ais: [
      require("./routes/v2/ais/ais"),
    ],
    events: [
      require("./routes/v2/events/events"),
    ],
  }
};

// Initialize Version-Specific Middleware
var middleware = {};
for (apiVersion in routes) {
  middleware[apiVersion] = require("./middleware/"+apiVersion+".js").middleware;
  for (middlewareFunc in middleware[apiVersion]) {
   app.use("/"+apiVersion+"/", middleware[apiVersion][middlewareFunc]);
  }
}
// Initialize Routes
for (apiVersion in routes) {
  for (routeName in routes[apiVersion]) {
  for (route in routes[apiVersion][routeName]) {
    app.use("/"+apiVersion+"/"+routeName, routes[apiVersion][routeName][route]);
  }
  }
}

// Health Check Endpoint
var healthCheck = require("./utils/internal-rfcx/health-check.js").healthCheck;
app.get("/health_check", function(req,res){ healthCheck.httpResponse(req,res); });

// Default Endpoint
app.get('/',function(req,res){
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication. Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  });
});

// Catch & Report Various HTTP Errors (needs some work)

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  var status = err.status || 500;
  loggers.errorLogger.log('Express.js error handler', { req: req, url: req.url, status: status, err: err });
  res.status(status).json({
    message: err.message,
    error: err
  });
});

module.exports = app;
