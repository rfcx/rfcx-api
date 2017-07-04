var winston = require('winston');
require('winston-loggly-bulk');
winston.emitErrs = true;

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
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
    // other transports will go here...
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
