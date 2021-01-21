const twilioClient = require('twilio')

if (!process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_ACCOUNT_SID) {
  console.error('Unable to send SMS because Twilio environmental variables are not set')
}

exports.smsTwilio = {

  validateIncomingMessage: function (req) {
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error('Unable to validate SMS because Twilio environmental variables are not set')
      return
    }

    if (!req.headers['x-twilio-signature']) {
      console.error('Unable to validate SMS because request is missing x-twilio-signature header')
      return
    }

    return twilioClient.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      req.headers['x-twilio-signature'],
      req.headers['x-forwarded-proto'] + '://' + req.headers.host + req.originalUrl,
      req.body
    )
  },

  sendSms: function (msgBody, toAddress) {
    if (!process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_ACCOUNT_SID) {
      console.error('Unable to send SMS because Twilio environmental variables are not set')
      return
    }

    const smsOpts = {
      body: msgBody,
      from: process.env.GUARDIAN_API_SMS_ADDRESS,
      to: toAddress
    }
    twilioClient(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      .messages.create(smsOpts).then(message => console.log('SMS sent to ' + message.to + ' via Twilio: ' + message.body))
  }

}
