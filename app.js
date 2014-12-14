// check for environmental variable file and load if present
var fs = require("fs");
if (fs.existsSync("./config/env_vars.js")) {
  var env = require("./config/env_vars.js").env;
  for (i in env) { process.env[i] = env[i]; }
}

// New Relic Initialization
if (process.env.NODE_ENV === "production") {
  process.env.NEW_RELIC_HOME = __dirname+"/config"; require('newrelic');
}

// Load Production Version ID
process.env.productionVersionId = require("./config/version.js").productionVersionId;

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var port = process.env.PORT || 8080;
var app = express();

app.set("title", "Rainforest Connection API");
app.set("port", process.env.PORT || 8080);
app.use(favicon(__dirname + "/public/cdn/img/logo/favicon.ico"));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Routes
var routes = {
  "v1": {
    users: require("./routes/v1/users"),
    guardians: require("./routes/v1/guardians"),
    mapping: require("./routes/v1/mapping")
  }
};
for (apiVersion in routes) {
  for (routeName in routes[apiVersion]) {
    app.use("/"+apiVersion+"/"+routeName, routes[apiVersion][routeName]);
  }
}

//health check
app.get("/health_check",function(req,res){ res.status(200).json({rfcx:"awesome"});});

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
