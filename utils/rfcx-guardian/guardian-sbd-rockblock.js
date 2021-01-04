//var models = require('../../models')

exports.sbdRockBlock = {

  validateIncomingMessage: function(req) {
    
    var isValid = false;

   // if ( (req.headers["x-twilio-signature"] != null) && (process.env.TWILIO_AUTH_TOKEN != null) ) {

      isValid = true;/*twilioClient.validateRequest(
                  process.env.TWILIO_AUTH_TOKEN, 
                  req.headers["x-twilio-signature"], 
                  req.headers["x-forwarded-proto"] + "://" + req.headers.host + req.originalUrl, 
                  req.body
                );*/
 //   }

    return isValid;
  }

}
