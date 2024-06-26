const express = require('express')
const router = express.Router()
const { httpErrorHandler } = require('../../../common/error-handling/http')
const Converter = require('../../../common/converter')
const mailService = require('../../_services/mail/mail-service')
const contactMessagesService = require('../../_services/contact-messages/contact-messages-service')

router.route('/contact')
  .post((req, res) => {
    const transformedParams = {}
    const params = new Converter(req.body, transformedParams)

    params.convert('_replyto').toString().trim().nonEmpty()
    params.convert('_subject').toString().trim().nonEmpty()
    params.convert('message').toString().trim().nonEmpty()
    params.convert('token').toString().trim().nonEmpty()

    params.validate()
      .then(() => {
        return contactMessagesService.verifyRecaptchaToken(transformedParams.token)
      })
      .then(() => {
        return contactMessagesService.createMessage({
          email: transformedParams._replyto,
          subject: transformedParams._subject,
          message: transformedParams.message
        })
      })
      .then(() => {
        return mailService.renderContactFormEmail({
          _replyto: transformedParams._replyto,
          message: transformedParams.message
        })
      })
      .then((html) => {
        return mailService.sendMessage({
          from_name: 'RFCx Contact Form',
          email: 'contact@rfcx.org',
          subject: transformedParams._subject,
          html
        })
      })
      .then(result => res.status(200).json(result))
      .catch(httpErrorHandler(req, res, 'Email couldn\'t be sent.'))
  })

module.exports = router
