const express = require('express')
const cors = require('cors')
const addRequestId = require('express-request-id')

const logging = require('../common/middleware/logging')
const metrics = require('../common/middleware/metrics')
const { urlEncoded, json, multipartFile } = require('../common/middleware/body-parsing')
const routeMiddleware = require('../common/middleware/route')
const { authenticate } = require('../common/middleware/authorization/authorization')
const coreRoutes = require('./routes')
const internalRoutes = require('./internal/routes')

const app = express()

app.use(addRequestId({ attributeName: 'guid' })) // TODO Still needed?
app.use(cors()) // TODO Should we limit which routes need cors?
app.use(logging, metrics)
app.use(urlEncoded, json, multipartFile)

// Main routes
for (const routeName in coreRoutes) {
  app.use(`/${routeName}`, routeMiddleware, authenticate())
  for (const route in coreRoutes[routeName]) {
    app.use(`/${routeName}`, coreRoutes[routeName][route])
  }
}
for (const routeName in internalRoutes) {
  app.use(`/internal/${routeName}`, routeMiddleware, authenticate())
  for (const route in internalRoutes[routeName]) {
    app.use(`/internal/${routeName}`, internalRoutes[routeName][route])
  }
}

// Support routes
app.use(require('./info'))
app.use('/docs', require('./_docs'))

// Catch errors
const { notFound, exceptionOccurred } = require('../common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
