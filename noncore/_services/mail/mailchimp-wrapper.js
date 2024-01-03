const rp = require('request-promise')
const { ValidationError } = require('../../../common/error-handling/errors')
const Promise = require('bluebird')
const mandrill = require('mandrill-api/mandrill')
const mandrillClient = new mandrill.Mandrill(process.env.MANDRILL_KEY)

module.exports = {
  subsribeToList: function (listId, email) {
    const options = {
      method: 'POST',
      url: `${process.env.MAILCHIMP_API_URL}/lists/${listId}/members`,
      auth: {
        user: 'anystring',
        password: process.env.MAILCHIMP_KEY
      },

      body: { email_address: email, status: 'subscribed' },
      json: true
    }

    return rp(options).catch(body => {
      if (body.error.title === 'Member Exists') {
        return {}
      }
      throw new ValidationError(body.error.detail)
    })
  },
  sendMail: function (email, name, subject, message) {
    return new Promise(function (resolve, reject) {
      const msg = {
        text: message,
        subject,
        from_email: 'contact@rfcx.org',
        from_name: 'Rainforest Connection',
        to: [{
          email,
          name: name === '' ? null : name,
          type: 'to'
        }],

        auto_html: true
      }

      mandrillClient.messages.send({ message: msg, async: true }, function () {
        resolve({ success: true })
      }, function (e) {
        reject(new Error(`Error sending mail: ${e.name} - ${e.message}`))
      })
    })
  },

  sendMessage: (opts) => {
    return new Promise(function (resolve, reject) {
      const message = {
        text: opts.text ? opts.text : null,
        html: opts.html ? opts.html : null,
        subject: opts.subject || 'Information',
        from_email: opts.from_email || 'contact@rfcx.org',
        from_name: opts.from_name || 'Rainforest Connection',
        to: [{
          email: opts.email,
          name: opts.name ? opts.name : null,
          type: 'to'
        }],
        important: opts.important !== undefined ? opts.important : null,
        bcc_address: opts.bcc_address ? opts.bcc_address : null,
        auth_text: true,
        auto_html: true
      }

      mandrillClient.messages
        .send({
          message,
          async: true
        },
        () => {
          resolve({ success: true })
        },
        (e) => {
          reject(e)
        })
    })
  },

  sendEmail: (opts) => {
    return new Promise(function (resolve, reject) {
      const message = {
        text: opts.text ? opts.text : null,
        html: opts.html ? opts.html : null,
        subject: opts.subject || 'Information',
        from_email: opts.from_email || 'contact@rfcx.org',
        from_name: opts.from_name || 'Rainforest Connection',
        to: opts.to,
        important: opts.important !== undefined ? opts.important : null,
        bcc_address: opts.bcc_address ? opts.bcc_address : null,
        merge_language: opts.merge_language ? opts.merge_language : 'mailchimp',
        global_merge_vars: opts.global_merge_vars ? opts.global_merge_vars : [],
        merge_vars: opts.merge_vars ? opts.merge_vars : [],
        auth_text: true,
        auto_html: true
      }

      mandrillClient.messages
        .send({
          message,
          async: true
        },
        () => {
          resolve({ success: true })
        },
        (e) => {
          reject(e)
        })
    })
  }

}
