const express = require('express')
const cors = require('cors')

const logging = require('../common/middleware/logging')
const metrics = require('../common/middleware/metrics')
const { urlEncoded, json, multipartFile } = require('../common/middleware/body-parsing')

const app = express()

// Middleware
app.use(cors())
app.use(logging, metrics)
app.use(urlEncoded, json, multipartFile.any())

// Enable documentation
app.use('/docs', require('./_docs'))

// RabbitMQ specific endpoints
app.use('/internal/rabbitmq', require('./authentication'))

// Catch errors
const { notFound, exceptionOccurred } = require('../common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
