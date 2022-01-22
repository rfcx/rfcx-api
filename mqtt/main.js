console.log('----------------------------------\nRFCX | main-mqtt started')

// check that all required env vars are set
require('../common/config/inspector')

const appId = 'rfcx-api-mqtt'

const app = require('./app')
const guidService = require('../utils/misc/guid')

const mqttCheckInRouter = require('../noncore/_utils/rfcx-mqtt/mqtt-checkin-router').mqttCheckInRouter
const pingRouter = require('../noncore/_utils/rfcx-guardian/router-ping').pingRouter

console.log('RFCX | Starting server')

app.http.listen(app.http.get('port'), function () {
  console.log('http: ' + app.http.get('title') + ' (port ' + app.http.get('port') + ') (' + process.env.NODE_ENV + ')')
})

const subscriptionOptions = {
  qos: 2
}

const checkinsTopicName = 'grd/+/chk'
const pingsTopicName = 'grd/+/png'

app.mqtt.on('connect', function () {
  console.log('mqtt: ' + appId + ' (' + app.mqtt.options.protocol + '://' + app.mqtt.options.host + ':' + app.mqtt.options.port + ') (' + process.env.NODE_ENV + ')')
  app.mqtt.unsubscribe(checkinsTopicName, (err) => {
    if (err) {
      console.log(`mqtt: could not unsubscribe from topic "${checkinsTopicName}"`, err)
      return
    }
    console.log(`mqtt: unsubscribed from topic "${checkinsTopicName}"`)
    app.mqtt.subscribe(checkinsTopicName, subscriptionOptions, (err, granted) => {
      if (err) {
        console.log(`mqtt: could not subscribe to topic "${checkinsTopicName}"`, err)
        return
      }
      console.log(`mqtt: subscribed to topic "${checkinsTopicName}"`, granted)
    })
  })
  app.mqtt.unsubscribe(pingsTopicName, (err) => {
    if (err) {
      console.log(`mqtt: could not unsubscribe from topic "${pingsTopicName}"`, err)
      return
    }
    console.log(`mqtt: unsubscribed from topic "${pingsTopicName}"`)
    app.mqtt.subscribe(pingsTopicName, subscriptionOptions, (err, granted) => {
      if (err) {
        console.log(`mqtt: could not subscribe to topic "${pingsTopicName}"`, err)
        return
      }
      console.log(`mqtt: subscribed to topic "${pingsTopicName}"`, granted)
    })
  })
})

app.mqtt.on('error', (err) => {
  console.log('mqtt: Error', err)
})

app.mqtt.on('reconnect', () => {
  console.log('mqtt: Reconnected.')
})
app.mqtt.on('close', () => {
  console.log('mqtt: Closed.')
})

if (process && process.pid) {
  console.log('pid', process.pid)
}

app.mqtt.on('message', (topic, data) => {
  let messageId = guidService.generate()
  console.log('new mqtt message', topic, messageId)

  if (/grd\/.+\/chk/.test(topic)) {
    return mqttCheckInRouter.onMessageCheckin(data, messageId)
      .then((result) => {
        app.mqtt.publish(`grd/${result.guardian_guid}/cmd`, result.gzip)

        // THE FOLLOWING "publish" LINE IS INCLUDED TO SUPPORT GUARDIANS DEPLOYED PRIOR TO Q2, 2020
        // AFTER ALL Q2 2020 GUARDIANS HAVE EXPIRED, THE LINE BELOW SHOULD BE REMOVED
        app.mqtt.publish(`guardians/${result.guardian_guid}/guardian/checkins`, result.gzip)
        // AFTER ALL Q2 2020 GUARDIANS HAVE EXPIRED, THE LINE ABOVE SHOULD BE REMOVED

        console.log('mqtt message processed', topic, messageId)
        messageId = null
        result = null
        return true
      })
      .catch((err) => {
        if (typeof (err) === 'string') {
          err = { message: err }
        }
        console.error('mqtt message error', err)
      })
  } else if (/grd\/.+\/png/.test(topic)) {
    return pingRouter.onMqttMessagePing(data, messageId)
      .then((result) => {
        if (Object.keys(result.obj).length > 0) {
          app.mqtt.publish(`grd/${result.guardian_guid}/cmd`, result.gzip)
        }

        console.log('mqtt message processed', topic, messageId)
        messageId = null
        result = null
        return true
      })
      .catch((err) => {
        if (typeof (err) === 'string') {
          err = { message: err }
        }
        console.error('mqtt message error', err)
      })
  }
})
