var winston = require('winston');
winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: process.env.NODE_ENV === 'development'
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
