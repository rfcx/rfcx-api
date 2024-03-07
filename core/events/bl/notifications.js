const { query } = require('../../subscriptions/dao')
const subscriptionTypes = require('../../subscriptions/dao/subscription-types')
const mailService = require('../../../noncore/_services/mail/mail-service')
const firebaseService = require('../../../noncore/_services/firebase/firebase-service')
const moment = require('moment-timezone')
const { getTzByLatLng } = require('../../_utils/datetime/timezone')
let emailTemplate

/**
 * Define html template for email notifications on app initialization
 */
(function () {
  mailService.getEventAlertHtml()
    .then((html) => {
      emailTemplate = html
    })
    .catch((err) => {
      console.error('Failed fetching email template for Event notification.', err)
    })
})()

/**
 * Splits raw array of random subscriptions into regulated object-based array
 * @param {*} subscriptions
 */
function splitSubscriptions (subscriptions) {
  const splitted = {}
  subscriptionTypes.forEach((t) => {
    splitted[t.name] = []
  })
  subscriptions.forEach((s) => {
    const sName = s.subscription_type.name
    const email = s.user.email
    if (!splitted[sName].includes(email)) {
      splitted[sName].push(email)
    }
  })
  return splitted
}

/**
 * Sends notifications for specified event
 * @param {*} event
 * @param {*} event.stream
 * @param {string} event.stream.id
 * @param {string} event.stream.name
 * @param {float} event.stream.latitude
 * @param {float} event.stream.longitude
 * @param {*|null} event.stream.project
 * @param {string} event.stream.project.id
 * @param {*} event.classification
 * @param {string} event.classification.title
 */
async function notify (event) {
  // TODO: update function logic when we will have organization and stream subscriptions
  if (event.stream && event.stream.project) {
    const subs = await query(null, event.stream.project.id, 'project')
    const splittedSubs = splitSubscriptions(subs)
    const data = {
      streamId: event.stream.id,
      streamName: event.stream.name,
      classificationName: event.classification.title,
      time: moment.tz(event.start, await getTzByLatLng(event.stream.latitude, event.stream.longitude)).format('HH:mm YYYY-MM-DD')
    }
    const pnData = {
      ...data,
      topic: event.stream.project.id,
      latitude: `${event.stream.latitude}`,
      longitude: `${event.stream.longitude}`
    }
    await Promise.all([
      sendEmails(splittedSubs.Email, data),
      sendPushNotifications(splittedSubs['Push Notification'], pnData)
    ])
  }
}

/**
 * Calls mail service with prepered data
 * @param {*} emails
 * @param {*} data
 */
function sendEmails (emails, data) {
  if (!emailTemplate) {
    throw Error('Email template for Event notification is not defined.')
  }
  if (!emails || !emails.length) {
    return
  }
  const to = emails.map((e) => { return { email: e, name: null, type: 'to' } })
  const subject = `A ${data.classificationName} detected on ${data.streamName} at ${data.time}`
  return mailService.sendEmail({
    from_email: 'noreply@rfcx.org',
    from_name: 'Rainforest Connection',
    merge_language: 'handlebars',
    to,
    global_merge_vars: [
      { name: 'streamName', content: data.streamName },
      { name: 'classificationName', content: data.classificationName },
      { name: 'time', content: data.time }
    ],
    merge_vars: [],
    subject,
    html: emailTemplate
  })
}

/**
 * Calls firebase service with prepared data
 * @param {*} users
 * @param {*} data
 */
function sendPushNotifications (users, data) {
  const body = `A ${data.classificationName} detected on ${data.streamName} at ${data.time}`
  const { streamId, streamName, time, latitude, longitude, classificationName } = data
  const opts = {
    app: 'rangerApp',
    topic: data.topic,
    data: { streamId, streamName, time, latitude, longitude, classificationName },
    title: 'Rainforest Connection',
    body
  }
  return firebaseService.sendToTopic(opts)
}

module.exports = {
  notify
}
