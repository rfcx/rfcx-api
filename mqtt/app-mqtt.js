const mqtt = require('mqtt')

const { randomGuid } = require('../common/random/hash')
const { mqttCheckInRouter } = require('../noncore/_utils/rfcx-mqtt/mqtt-checkin-router')
const { pingRouter } = require('../noncore/_utils/rfcx-guardian/router-ping')

const connectionOptions = {
  clientId: 'rfcx-api-mqtt-development' + process.env.NODE_ENV + Math.random().toString(16).substr(2, 8),
  host: process.env.MQTT_BROKER_HOST,
  port: process.env.MQTT_BROKER_PORT,
  protocol: 'tcp',
  username: process.env.MQTT_BROKER_USER,
  password: process.env.MQTT_BROKER_PASSWORD,
  protocolId: 'MQIsdp',
  protocolVersion: 3,
  qos: 2,
  connectTimeout: 2000,
  debug: true
}
const subscriptionOptions = {
  qos: 2
}
const checkinsTopicName = 'grd/+/chk'
const pingsTopicName = 'grd/+/png'


function listen() {
  const app = mqtt.connect(connectionOptions)

  app.on('error', (err) => console.log('MQTT: Error', err))
  app.on('reconnect', () => console.log('MQTT: Reconnected'))
  app.on('close', () => console.log('MQTT: Closed'))

  app.on('connect', function () {
    console.log('MQTT: Connected (' + app.options.protocol + '://' + app.options.host + ':' + app.options.port + ') (' + process.env.NODE_ENV + ')')
    app.unsubscribe(checkinsTopicName, (err) => {
      if (err) {
        console.log(`MQTT: could not unsubscribe from topic "${checkinsTopicName}"`, err)
        return
      }
      console.log(`MQTT: unsubscribed from topic "${checkinsTopicName}"`)
      app.subscribe(checkinsTopicName, subscriptionOptions, (err, granted) => {
        if (err) {
          console.log(`MQTT: could not subscribe to topic "${checkinsTopicName}"`, err)
          return
        }
        console.log(`MQTT: subscribed to topic "${checkinsTopicName}"`, granted)
      })
    })
    app.unsubscribe(pingsTopicName, (err) => {
      if (err) {
        console.log(`MQTT: could not unsubscribe from topic "${pingsTopicName}"`, err)
        return
      }
      console.log(`MQTT: unsubscribed from topic "${pingsTopicName}"`)
      app.subscribe(pingsTopicName, subscriptionOptions, (err, granted) => {
        if (err) {
          console.log(`MQTT: could not subscribe to topic "${pingsTopicName}"`, err)
          return
        }
        console.log(`MQTT: subscribed to topic "${pingsTopicName}"`, granted)
      })
    })
  })

  app.on('message', (topic, data) => {
    let messageId = randomGuid()
    console.log('MQTT: new mqtt message', topic, messageId)

    if (/grd\/.+\/chk/.test(topic)) {
      return mqttCheckInRouter.onMessageCheckin(data, messageId)
        .then((result) => {
          app.publish(`grd/${result.guardian_guid}/cmd`, result.gzip)

          // THE FOLLOWING "publish" LINE IS INCLUDED TO SUPPORT GUARDIANS DEPLOYED PRIOR TO Q2, 2020
          // AFTER ALL Q2 2020 GUARDIANS HAVE EXPIRED, THE LINE BELOW SHOULD BE REMOVED
          app.publish(`guardians/${result.guardian_guid}/guardian/checkins`, result.gzip)
          // AFTER ALL Q2 2020 GUARDIANS HAVE EXPIRED, THE LINE ABOVE SHOULD BE REMOVED

          console.log('MQTT: message processed', topic, messageId)
          messageId = null
          result = null
          return true
        })
        .catch((err) => {
          if (typeof (err) === 'string') {
            err = { message: err }
          }
          console.error('MQTT: message error', err)
        })
    } else if (/grd\/.+\/png/.test(topic)) {
      return pingRouter.onMqttMessagePing(data, messageId)
        .then((result) => {
          if (Object.keys(result.obj).length > 0) {
            app.publish(`grd/${result.guardian_guid}/cmd`, result.gzip)
          }

          console.log('MQTT: message processed', topic, messageId)
          messageId = null
          result = null
          return true
        })
        .catch((err) => {
          if (typeof (err) === 'string') {
            err = { message: err }
          }
          console.error('MQTT: message error', err)
        })
    }
  })
}

module.exports = { listen }