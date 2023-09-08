const mqtt = require('mqtt')

const isEnabled = `${process.env.IOTDA_ENABLED}` === 'true'
const availableProjects = process.env.IOTDA_PROJECTS != null ? process.env.IOTDA_PROJECTS.split(',') : []

const connectionOptions = {
  clientId: '',
  host: process.env.IOTDA_MQTT_HOSTNAME ?? '',
  port: '1883',
  protocol: 'tcp',
  username: '',
  password: '',
  protocolVersion: 3,
  protocolId: 'MQIsdp',
  qos: 1,
  connectTimeout: 2000,
  debug: true
}

function forwardMessage (device, message) {
  connectionOptions.clientId = device.clientId
  connectionOptions.username = device.username
  connectionOptions.password = device.password
  let app = mqtt.connect(connectionOptions)

  app.on('error', (err) => {
    console.error('IoTDA MQTT: Error', err)
    app = null
  })
  app.on('reconnect', () => {
    console.info('IoTDA MQTT: Reconnected')
    // No need to reconnect to avoid reconnection loop stuck
    app = null
  })
  app.on('close', () => {
    console.info('IoTDA MQTT: Closed')
    app = null
  })

  app.on('connect', function () {
    console.info('IoTDA MQTT: Connected')
    app.publish(`$oc/devices/${device.username}/sys/properties/report`, JSON.stringify(message))

    // disconnect after publish
    app.end()
  })
}

module.exports = { forwardMessage, isEnabled, availableProjects }
