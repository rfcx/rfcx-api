const Converter = require('../../../common/converter')
const Promise = require('bluebird')
const mailing = require('./mailchimp-wrapper')
const fs = require('fs')
const path = require('path')
const handlebars = require('handlebars')

function sendTextMail (serviceRequest) {
  const params = {}
  serviceRequest = new Converter(serviceRequest, params)
  serviceRequest.convert('email_address').toString()
  serviceRequest.convert('recipient_name').optional().default('').toString()
  serviceRequest.convert('subject').toString()
  serviceRequest.convert('message').toString()

  return serviceRequest.validate()
    .then(() => {
      return mailing.sendMail(params.email_address, params.recipient_name, params.subject, params.message)
    })
}

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
  serviceRequest.convert('from_email').optional().toString()
  serviceRequest.convert('from_name').optional().toString()
  serviceRequest.convert('merge_language').optional().toString()
  serviceRequest.convert('to').toArray()
  serviceRequest.convert('global_merge_vars').optional().toArray()
  serviceRequest.convert('merge_vars').optional().toArray()
  serviceRequest.convert('important').optional().toBoolean()
  serviceRequest.convert('bcc_address').optional().toString()

  return serviceRequest.validate()
    .then(() => {
      return mailing.sendEmail(params)
    })
}

function renderContactFormEmail (opts) {
  return new Promise((resolve, reject) => {
    try {
      const source = fs.readFileSync(path.join(__dirname, '../../views/email/contact-form.handlebars'), 'utf8')
      const template = handlebars.compile(source)
      resolve(template(opts))
    } catch (e) {
      reject(e)
    }
  })
}

function getDetectionAlertHtml () {
  return new Promise((resolve, reject) => {
    try {
      const source = fs.readFileSync(path.join(__dirname, '../../views/email/detection-alert.handlebars'), 'utf8')
      resolve(source)
    } catch (e) {
      reject(e)
    }
  })
}

function getEventAlertHtml () {
  return new Promise((resolve, reject) => {
    try {
      const source = fs.readFileSync(path.join(__dirname, '../../views/email/event-alert.handlebars'), 'utf8')
      resolve(source)
    } catch (e) {
      reject(e)
    }
  })
}

function registerToAppWaitingList (serviceRequest) {
  const params = {}
  serviceRequest = new Converter(serviceRequest, params)

  serviceRequest.convert('email_address').toString()
  serviceRequest.convert('requested_os').optional().default('iOS').toString()

  return serviceRequest.validate().then(() => {
    return mailing.subsribeToList(process.env.MAILCHIMP_APP_WAITING_LIST, params.email_address)
  }).then(() => {
    return { email_address: params.email_address, method: 'subscribe_to_list', success: true }
  })
}

module.exports = {
  registerToAppWaitingList,
  sendTextMail,
  sendMessage,
  sendEmail,
  renderContactFormEmail,
  getDetectionAlertHtml,
  getEventAlertHtml
}