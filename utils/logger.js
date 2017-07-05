var winston = require('winston');
var winstonCloudwatch = require('winston-cloudwatch');
winston.emitErrs = true;

function retrieveRequestData(str) {
  return {
    timestamp: str.match(/\[timestamp (.*?)\]/)[1],
    status: str.match(/\[status (.*?)\]/)[1],
    method: str.match(/\[method (.*?)\]/)[1],
    url: str.match(/\[url (.*?)\]/)[1],
    remoteAddr: str.match(/\[remote-addr (.*?)\]/)[1],
    user: str.match(/\[user (.*?)\]/)[1],
    response: str.match(/\[response (.*?)\]/)[1],
  };
}

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      handleExceptions: true,
      json: false,
      colorize: process.env.NODE_ENV === 'development'
    }),
    new winstonCloudwatch({
      level: 'info',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: process.env.AWS_REGION_ID,
      logGroupName: 'rfcx-api-test',
      logStreamName: 'api',
      messageFormatter: function(log) {
        return JSON.stringify(retrieveRequestData(log.msg));
      }
    })
  ],
  exceptionHandlers: [
    new winstonCloudwatch({
      level: 'info',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: process.env.AWS_REGION_ID,
      logGroupName: 'rfcx-api-test',
      logStreamName: 'errors',
      handleExceptions: true,
      humanReadableUnhandledException: true,
      json: true,
    }),
  ],
  exitOnError: false
});

function determineLogLevel() {
  var levels = ['error', 'warn', 'info', 'debug'],
      envLevel = process.env.NODE_LOG_LEVEL? process.env.NODE_LOG_LEVEL.trim().toLowerCase() : undefined ;
  if (!!envLevel && levels.indexOf(envLevel) !== -1) {
    return envLevel;
  }
  else {
    logger.error('Log level "' + process.env.NODE_LOG_LEVEL + '" is invalid. Choose one of: ' + levels.join(', '));
    // winston.loggers.get('cloudwatch-error').error('Log level "' + process.env.NODE_LOG_LEVEL + '" is invalid. Choose one of: ' + levels.join(', '));
    if (process.env.NODE_ENV !== 'production') {
      return 'debug';
    }
    return 'info';
  }
}

winston.level = determineLogLevel();

module.exports = logger;
module.exports.stream = {
  write: function(message, encoding){
    // remove last symbol to prevent double line break (Morgan add his line break)
    logger.info(message.slice(0, -1));
  }
};
