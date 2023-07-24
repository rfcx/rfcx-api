const mqtt = require('mqtt')

const connectionOptions = {
  clientId: '',
  host: process.env.IOTDA_MQTT_HOSTNAME,
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
  const app = mqtt.connect(connectionOptions)

  app.on('error', (err) => console.error('IoTDA MQTT: Error', err))
  app.on('reconnect', () => console.info('IoTDA MQTT: Reconnected'))
  app.on('close', () => console.info('IoTDA MQTT: Closed'))

  app.on('connect', function () {
    console.info('IoTDA MQTT: Connected')
    app.publish(`$oc/devices/${device.username}/sys/properties/report`, JSON.stringify(message))

    // disconnect after publish
    app.end()
  })
}

module.exports = { forwardMessage }
