const express = require('express')
const router = express.Router()
const { httpErrorResponse } = require('../../../common/error-handling/http')
const ValidationError = require('../../../utils/converter/validation-error')
const ForbiddenError = require('../../../utils/converter/forbidden-error')
const sequelize = require('sequelize')
const Converter = require('../../../utils/converter/converter')
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
      .catch(sequelize.EmptyResultError, e => httpErrorResponse(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpErrorResponse(req, res, 400, null, e.message))
      .catch(ForbiddenError, e => httpErrorResponse(req, res, 403, null, e.message))
      .catch(e => { console.log('e', e); httpErrorResponse(req, res, 500, e, "Email couldn't be sent.") })
  })

module.exports = router
