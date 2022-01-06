const Converter = require('../../utils/converter/converter')
const models = require('../../models-legacy')
const Promise = require('bluebird')
const request = require('request')
const ForbiddenError = require('../../utils/converter/forbidden-error')

function validateCreateParams (params) {
  params = new Converter(params)

  params.convert('email').toString()
  params.convert('subject').toString()
  params.convert('message').toString()

  return params.validate()
}

function createMessage (params) {
  return validateCreateParams(params)
    .then(data => {
      data.message = escapeReturns(data.message)
      return models.ContactMessage.create(data)
    })
}

function escapeReturns (message) {
  return message.replace(/[\n\r]/g, ' ')
}

function verifyRecaptchaToken (token) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'POST',
      uri: `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_V3_SECRET_KEY}&response=${token}`,
      json: true
    }, (err, response, body) => {
      if (err) {
        reject(new ForbiddenError('You don\'t have permissions.'))
      } else if (!!body && body.score <= 0.5) {
        reject(new ForbiddenError('You don\'t have permissions.'))
      } else if (!!body && !!body.error) {
        reject(body)
      } else {
        resolve(body)
      }
    })
  })
}

module.exports = {
  createMessage,
  verifyRecaptchaToken
}
