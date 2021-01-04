//var models = require('../../models')
const twilioClient = require('twilio');

exports.smsTwilio = {

  validateIncomingMessage: function(req) {
    
    var isValid = false;

    if ( (req.headers["x-twilio-signature"] != null) && (process.env.TWILIO_AUTH_TOKEN != null) ) {

      isValid = twilioClient.validateRequest(
                  process.env.TWILIO_AUTH_TOKEN, 
                  req.headers["x-twilio-signature"], 
                  req.headers["x-forwarded-proto"] + "://" + req.headers.host + req.originalUrl, 
                  req.body
                );
    }

    return isValid;
  },

  sendSms: function (msgBody, toAddress) {
    
    if ( (process.env.TWILIO_ACCOUNT_SID != null) && (process.env.TWILIO_AUTH_TOKEN != null) ) {

      var smsOpts = {
        body: msgBody,
        from: process.env.GUARDIAN_API_SMS_ADDRESS,
        to: toAddress
      };

      twilioClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        .messages.create(smsOpts).then(message => console.log("SMS sent to " + message.to + " via Twilio: " + message.body));
      
    } else {
      console.error("Unable to send SMS because Twilio environmental variables are not set");
    }

  }

}
