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

  This util exports 4 logger, each for own separate type of logs:
  debugLogger which should be used as `debugLogger.debug('text')`
  infoLogger which should be used as `infoLogger.info('text')`
  warnLogger which should be used as `warnLogger.warn('text')`
  errorLogger which should be used as `errorLogger.error('text')`
*/

var winston = require('winston');
var cloudWatchTransport = require('winston-aws-cloudwatch')

var logLevel = determineLogLevel(),
    groupName = process.env.CLOUDWATCH_LOGS_GROUP_NAME || 'rfcx-api';

winston.emitErrs = true;
winston.level = logLevel;

/**
 * Creates new Winston looger with Console and CloudWatchLogs transports.
 * @param {String} logStreamName - stream name for CloudWatch Logs transport
 * @param {Boolean} includeExceptionsHandler - indicates whether create exceptionHandlers into logger or not
 */
function createLogger(logStreamName, includeExceptionsHandler) {
  var opts = {
    level: logLevel,
    transports: [
      new winston.transports.Console({
        json: false,
        colorize: process.env.NODE_ENV === 'development'
      }),
      new cloudWatchTransport({
        logGroupName: groupName,
        logStreamName: logStreamName,
        createLogGroup: true,
        createLogStream: true,
        awsConfig: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_KEY,
          region: process.env.AWS_REGION_ID
        },
      })
    ],
    exitOnError: false
  }
  if (!!includeExceptionsHandler) {
    opts.exceptionHandlers = [
      new cloudWatchTransport({
        logGroupName: groupName,
        logStreamName: 'unhandled-errors',
        createLogGroup: true,
        createLogStream: true,
        awsConfig: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_KEY,
          region: process.env.AWS_REGION_ID
        },
      })
    ]
  }
  return new winston.Logger(opts);
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
