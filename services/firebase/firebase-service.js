const firebase = require('../../utils/firebase/firebase')

/**
 * Sends a Firebase message to individual device
 * @namespace
 * @property {string} app Firebase app name: 'rangerApp' or 'playerApp'
 * @property {string} token Firebase device token
 * @property {object} [data] Optional data to send
 * @property {string} title Push notification title
 * @property {string} body Push notification body
 */
function sendToIndividualDevice (opts) {
  const defaultMes = createPlatformSpecificFields(opts.title, opts.body)
  const message = Object.assign(defaultMes, { data: opts.data || {}, token: opts.token })
  return sendMessage(opts.app, message)
}

/**
 * Sends a Firebase message to specified topic
 * @namespace
 * @property {string} app Firebase app name: 'rangerApp' or 'playerApp'
 * @property {string} topic Firebase topic name
 * @property {object} [data] Optional data to send
 * @property {string} title Push notification title
 * @property {string} body Push notification body
 */
function sendToTopic (opts) {
  const defaultMes = createPlatformSpecificFields(opts.title, opts.body)
  const message = Object.assign(defaultMes, { data: opts.data || {}, topic: opts.topic })
  return sendMessage(opts.app, message)
}

function sendMessage (app, message) {
  return firebase[app]
    .messaging()
    .send(message)
}

function createPlatformSpecificFields (title, body) {
  return {
    android: {
      ttl: 3600 * 1000, // 1 hour in milliseconds
      priority: 'normal',
      notification: {
        title,
        body,
        sound: 'default'
      }
    },
    apns: {
      headers: {
        'apns-priority': '10'
      },
      payload: {
        aps: {
          alert: {
            title,
            body
          }
        }
      }
    },
    webpush: {
      notification: {
        title,
        body,
        icon: 'https://dashboard.rfcx.org/assets/img/logo-square-192.png'
      }
    }
  }
}

module.exports = {
  sendToIndividualDevice,
  sendToTopic
}
