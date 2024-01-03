const mandrill = require('mandrill-api/mandrill')
const Promise = require('bluebird')

exports.mandrill = function () {
  return {

    client: function () {
      // Returns a 'mandrill' client.
      return new mandrill.Mandrill(process.env.MANDRILL_KEY)
    },

    buildMessage: function (messageOptions) {
      return {
        html: '<p>Example HTML content</p>',
        text: 'Example text content',
        subject: 'Subject: ' + (new Date()).toISOString(),
        from_email: 'admin@rfcx.org',
        from_name: 'Email: ' + (new Date()).toISOString(),
        to: [{
          email: messageOptions.recipient_email,
          name: 'Recipient Name',
          type: 'to'
        }],
        headers: {
          'Reply-To': 'admin@rfcx.org'
        },
        important: false,
        track_opens: null,
        track_clicks: null,
        auto_text: null,
        auto_html: null,
        inline_css: null,
        url_strip_qs: null,
        preserve_recipients: null,
        view_content_link: null,
        bcc_address: 'admin@rfcx.org',
        tracking_domain: null,
        signing_domain: null,
        return_path_domain: null,
        merge: true,
        merge_language: 'mailchimp',
        global_merge_vars: [{
          name: 'merge1',
          content: 'merge1 content'
        }],
        merge_vars: [{
          rcpt: messageOptions.recipient_email,
          vars: [{
            name: 'merge2',
            content: 'merge2 content'
          }]
        }],
        tags: ['password-resets'],
        subaccount: null,
        google_analytics_domains: ['example.com'],
        google_analytics_campaign: 'message.from_email@example.com',
        metadata: {
          website: 'www.example.com'
        },
        recipient_metadata: [{
          rcpt: messageOptions.recipient_email,
          values: {
            user_id: 123456
          }
        }],
        attachments: [/* {
          type: "image/png",
          name: "image.png",
          content: ""
        } */],
        images: [{
          type: 'image/png',
          name: 'IMAGECID',
          content: 'ZXhhbXBsZSBmaWxl'
        }]
      }
    },

    sendMessage: function (messageOptions) {
      const client = this.client()
      const message = this.buildMessage(messageOptions)
      return new Promise(function (resolve, reject) {
        client.messages.send({
          message
          // "async": false,
          // "ip_pool": "Main Pool",
          // "send_at": null
        }, function (mandrillResult) {
          try {
            resolve(mandrillResult)
          } catch (e) {
            reject(e)
          }
        }, function (err) {
          reject(new Error(err))
        })
      })
    }

  }
}
