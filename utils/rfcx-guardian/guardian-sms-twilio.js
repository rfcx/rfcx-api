//var models = require('../../models')
const twilioClient = require('twilio');

exports.smsTwilio = {

  validateIncomingMessage: function(req) {
    
    var isValid = false;

    if (req.headers["x-twilio-signature"] != null) {
      var twiSig = req.headers["x-twilio-signature"],
          twiToken = process.env.TWILIO_AUTH_TOKEN,
          postParams = req.body,
          postUrl = req.headers["x-forwarded-proto"] + "://" + req.headers.host + req.originalUrl
          ;
      isValid = twilioClient.validateRequest(twiToken, twiSig, postUrl, postParams);
    }

    return isValid;
  },

  sendSms: function (msgBody, toAddress) {
    
  }

}
