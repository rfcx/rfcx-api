var winston = require('winston');
require('winston-loggly-bulk');
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
    response: log.msg.match(/\[response (.*?)\]/)[1],
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
    new winston.transports.Loggly({
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_SUBDOMAIN,
      tags: [ 'rfcx-api-test' ],
      json: true,
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
    // other transports will go here...
  ],
  exceptionHandlers: [
    new winston.transports.Loggly({
      token: process.env.LOGGLY_TOKEN,
      subdomain: process.env.LOGGLY_SUBDOMAIN,
      tags: [ 'rfcx-api-errors' ],
      handleExceptions: true,
      json: true,
    }),
    new winstonCloudwatch({
      level: 'info',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: process.env.AWS_REGION_ID,
      logGroupName: 'rfcx-api-test',
      logStreamName: 'errors',
      handleExceptions: true,
      json: true,
    }),
  ],
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write: function(message, encoding){
    // remove last symbol to prevent double line break (Morgan add his line break)
    logger.info(message.slice(0, -1));
  }
};
