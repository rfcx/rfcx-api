//var models = require('../../models')

exports.sbdRockBlock = {

  validateIncomingMessage: function(req) {
    
    var isValid = false;

    if (  (req.headers["x-forwarded-for"] != null) 
      &&  ( (req.headers["x-forwarded-for"] == "212.71.235.32") || (req.headers["x-forwarded-for"] == "109.74.196.135") )
      ) {

      isValid = true;/*twilioClient.validateRequest(
                  process.env.TWILIO_AUTH_TOKEN, 
                  req.headers["x-twilio-signature"], 
                  req.headers["x-forwarded-proto"] + "://" + req.headers.host + req.originalUrl, 
                  req.body
                );*/
    }

    return isValid;
  }

}
