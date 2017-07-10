/*
  We arranged that we have four log levels:
  1) Debug: this will only be activated when we have an issue with our production API and we want a lot more logging than usual.
  2) Info: that are messages that are normal and just inform us. An example is the logging of access i.e. get/post requests.
  3) Warning: these are recoverable errors. They shouldn't happen but don't create an exception.
    We should give them special attention, however, because they usually indicate protocol errors in clients.
    Examples are:
    - Requests shouldn't got to the root of the api but we have several requests to / in our access logs.
      That's not an error but it's a wrong use of the API which could indicate that a client is using it incorrectly.
    - If the parameters are wrong that the client sends to the api, we may just reject the request
      but should log the attempted wrong values as they indicate that a client might need an update.
  4) Errors: these are like exceptions on the programming level and mean that in the server something is wrong.

  This util exports 4 loggers, each for own separate type of logs: debugLogger, infoLogger, warnLogger, errorLogger.
  You can log messages using .log method on each of types (e.g. debugLogger.log('text', { req: req, foo: bar }))
*/

var winston = require('winston');
var cloudWatchTransport = require('winston-aws-cloudwatch')

var logLevel = determineLogLevel(),
    groupName = process.env.CLOUDWATCH_LOGS_GROUP_NAME || 'rfcx-api',
    // process.env.CLOUDWATCH_ENABLED has string type
    cloudWatchEnabled = process.env.CLOUDWATCH_ENABLED? process.env.CLOUDWATCH_ENABLED.toString() === 'true' : false;

winston.emitErrs = true;
winston.level = logLevel;

/**
 * Creates Winston CloudWatchLogs transport with given logGroupName and logStreamName
 * @param {String} logGroupName
 * @param {String} logStreamName
 * @returns {Object} cloudWatchTransport
 */
function createCloudWatchTransport(logGroupName, logStreamName) {
  var cloudwatchBaseOpts = {
    createLogGroup: true,
    createLogStream: true,
    awsConfig: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION_ID
    },
  }
  return new cloudWatchTransport(Object.assign({}, cloudwatchBaseOpts, {
    logGroupName: logGroupName,
    logStreamName: logStreamName,
  }));
}

/**
 * Creates wrapper around standard Winston logger, which makes two things:
 * 1) Chooses what level of log function it needs to call based on defined type
 * 2) Parses additional meta options from input and passes them to log function
 * @param {Object} winstonLogger - Winston logger instance
 * @param {String} type - logger's internal type
 * @returns {Object} - custom logger object with only one `log` method
 */
function createLoggerWrapper(winstonLogger, type) {
  var logger = {
    /**
     * Function which takes a message and additional info like req object
     * @param {String} message - A message to send to logs
     * @param {Object} [opts] - Optional object which can contain req and other meta-data. Just set like this { req: req, foo: bar } and
     * it will obtain request guid automatically and save other metadata
     */
    log: function(message, opts) {
      var meta = opts || {};
      if (meta.req) {
        meta['req-guid'] = meta.req.guid;
        delete meta.req;
      }
      switch (type) {
        case 'debug':
          winstonLogger.debug(message, meta);
          break;
        case 'warn':
          winstonLogger.warn(message, meta);
          break;
        case 'error':
          winstonLogger.error(message, meta);
          break;
        case 'info':
        default:
          winstonLogger.info(message, meta);
          break;
      }
    }
  };
  return logger;
}

/**
 * Creates new Winston looger with Console and CloudWatchLogs transports.
 * @param {String} type - logger's internal type; also stream name for CloudWatch Logs transport
 */
function createLogger(type) {
  var transports = [
    new winston.transports.Console({
      json: false,
      colorize: process.env.NODE_ENV === 'development'
    }),
  ];
  var exceptionHandlers = [];
  if (cloudWatchEnabled) {
    transports.push(createCloudWatchTransport(groupName, type));
    if (type === 'requests') {
      exceptionHandlers.push(createCloudWatchTransport(groupName, 'unhandled-errors'));
    }
  }
  var opts = {
    level: logLevel,
    transports: transports,
    exitOnError: false
  }
  if (type === 'requests') {
    opts.exceptionHandlers = exceptionHandlers;
    return new winston.Logger(opts);
  }
  else {
    var winstonLogger = new winston.Logger(opts);
    return createLoggerWrapper(winstonLogger, type);
  }
}

// create our loggers
var debugLogger = createLogger('debug'),
    infoLogger = createLogger('info'),
    warnLogger = createLogger('warn'),
    errorLogger = createLogger('error'),
    // used only for http requests and unhandled exceptions
    expressLogger = createLogger('requests', true);

/**
 * Function which gets log level from process.env.NODE_LOG_LEVEL or returns proper based on some conditions.
 * Prints error to error stream if env variable is invalid.
 * @returns {String} log level
 */
function determineLogLevel() {
  var levels = ['error', 'warn', 'info', 'debug'],
      envLevel = process.env.NODE_LOG_LEVEL? process.env.NODE_LOG_LEVEL.trim().toLowerCase() : undefined;
  if (!!envLevel && levels.indexOf(envLevel) !== -1) {
    return envLevel;
  }
  else {
    errorLogger.error('Log level "' + process.env.NODE_LOG_LEVEL + '" is invalid. Choose one of: ' + levels.join(', '));
    if (process.env.NODE_ENV !== 'production') {
      return 'debug';
    }
    return 'info';
  }
}

// stream for handling routes
var stream = {
  write: function(message){
    expressLogger.info(message);
  }
};

module.exports = {
  expressLogger: expressLogger,
  debugLogger: debugLogger,
  warnLogger: warnLogger,
  infoLogger: infoLogger,
  errorLogger: errorLogger,
  stream: stream,
};
