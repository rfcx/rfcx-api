const Converter = require('../../../common/converter')
const mailing = require('./mailchimp-wrapper')
const fs = require('fs')
const path = require('path')
const handlebars = require('handlebars')

function sendMessage (serviceRequest) {
  const params = {}
  serviceRequest = new Converter(serviceRequest, params)
  serviceRequest.convert('text').optional().default('').toString()
  serviceRequest.convert('html').optional().default('').toString()
  serviceRequest.convert('subject').optional().toString()
  serviceRequest.convert('from_email').optional().toString()
  serviceRequest.convert('from_name').optional().toString()
  serviceRequest.convert('email').toString()
  serviceRequest.convert('name').optional().toString()
  serviceRequest.convert('important').optional().toBoolean()
  serviceRequest.convert('bcc_address').optional().toString()

  return serviceRequest.validate()
    .then(() => {
      return mailing.sendMessage(params)
    })
}

function sendEmail (serviceRequest) {
  const params = {}
  serviceRequest = new Converter(serviceRequest, params)
  serviceRequest.convert('text').optional().default('').toString()
  serviceRequest.convert('html').optional().default('').toString()
  serviceRequest.convert('subject').optional().toString()
  serviceRequest.convert('from_email').toString().default('noreply@rfcx.org')
  serviceRequest.convert('from_name').toString().default('Rainforest Connection')
  serviceRequest.convert('merge_language').toString().default('handlebars')
  serviceRequest.convert('to').toArray()
  serviceRequest.convert('global_merge_vars').optional().toArray()
  serviceRequest.convert('merge_vars').toArray().default([])
  serviceRequest.convert('important').optional().toBoolean()
  serviceRequest.convert('bcc_address').optional().toString()

  return serviceRequest.validate()
    .then(() => {
      return mailing.sendEmail(params)
    })
}

function renderTemplate (tmplPath, opts) {
  return new Promise((resolve, reject) => {
    try {
      const source = fs.readFileSync(path.join(__dirname, tmplPath), 'utf8')
      const template = handlebars.compile(source)
      resolve(template(opts))
    } catch (e) {
      reject(e)
    }
  })
}

function renderContactFormEmail (opts) {
  return renderTemplate('../../views/email/contact-form.handlebars', opts)
}

function getEventAlertHtml (opts) {
  return renderTemplate('../../views/email/event-alert.handlebars', opts)
}

module.exports = {
  sendMessage,
  sendEmail,
  renderContactFormEmail,
  getEventAlertHtml
}
