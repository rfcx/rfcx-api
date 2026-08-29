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

function readTemplate (tmplPath) {
  return new Promise((resolve, reject) => {
    try {
      resolve(fs.readFileSync(path.join(__dirname, tmplPath), 'utf8'))
    } catch (e) {
      reject(e)
    }
  })
}

function renderTemplate (tmplPath, opts) {
  return readTemplate(tmplPath)
    .then((source) => handlebars.compile(source)(opts))
}

function renderContactFormEmail (opts) {
  return renderTemplate('../../views/email/contact-form.handlebars', opts)
}

/**
 * Read the event-alert template WITHOUT rendering it.
 *
 * Callers cache this source at boot and render it per send via
 * `renderEventAlert`. Compiling it here (as `getEventAlertHtml` did) would
 * substitute every `{{ }}` placeholder with an empty string, because the event
 * data is not known until an event fires.
 */
function getEventAlertSource () {
  return readTemplate('../../views/email/event-alert.handlebars')
}

/**
 * Render a cached event-alert template source with the event data.
 * @param {string} source raw handlebars source, from `getEventAlertSource`
 * @param {*} opts { streamName, classificationName, time }
 */
function renderEventAlert (source, opts) {
  return handlebars.compile(source)(opts)
}

module.exports = {
  sendMessage,
  sendEmail,
  renderContactFormEmail,
  getEventAlertSource,
  renderEventAlert
}
