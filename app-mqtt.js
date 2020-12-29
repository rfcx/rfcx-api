// various process-related stuff
require('./utils/process')
var path = require('path')

if (process.env.NODE_ENV === 'production') {
  require('newrelic')
}

var app = { http: null, mqtt: null }

var mqtt = require('mqtt')

app.mqtt = mqtt.connect({
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
})

var express = require('express')
var passport = require('passport')
var cors = require('cors')
var bodyParser = require('body-parser')
var multer = require('multer')

app.http = express()
app.http.set('title', 'rfcx-api-mqtt')
app.http.set('port', process.env.PORT || 8080)
app.http.use(cors())
app.http.use(require('./middleware/logging'))
app.http.use(require('./middleware/toobusy'))
app.http.use(bodyParser.urlencoded({ extended: false }))
app.http.use(bodyParser.json({ limit: '1mb' }))
app.http.use(multer(require('./config/multer').config(process.env)))
app.http.use(passport.initialize())

require('./middleware/route')

// Enable documentation
app.http.use('/docs', require('./docs/mqtt'))
// Default and health check routes
app.http.use(require('./routes/info'))
// RabbitMQ specific endpoints
app.http.use('/internal/rabbitmq', require('./routes/internal/rabbitmq'))

// Catch errors
const { notFound, exceptionOccurred } = require('./middleware/error')
app.http.use(notFound) // Last route, catches all
app.http.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
