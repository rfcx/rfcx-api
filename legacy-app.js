const express = require('express')
const cors = require('cors')
const addRequestId = require('express-request-id')

const logging = require('./common/middleware/logging')
const metrics = require('./common/middleware/metrics')
const { urlEncoded, json, multipartFile } = require('./common/middleware/body-parsing')
const routeMiddleware = require('./common/middleware/route')
const { authenticate } = require('./common/middleware/authorization/authorization')
const v1Routes = require('./noncore/v1/routes')
const v2Routes = require('./noncore/v2/routes')
const coreRoutes = require('./core/routes')
const internalRoutes = require('./core/internal/routes')

const app = express()

// Middleware
app.use(addRequestId({ attributeName: 'guid' }))
app.use(cors())
app.use(logging, metrics)
app.use(urlEncoded, json, multipartFile)

// Noncore routes
const versionedRoutes = { v1: v1Routes, v2: v2Routes }
for (const apiVersion in versionedRoutes) {
  app.use(`/${apiVersion}`, routeMiddleware)
}
for (const apiVersion in versionedRoutes) {
  for (const routeName in versionedRoutes[apiVersion]) {
    app.use(`/${apiVersion}/${routeName}`, versionedRoutes[apiVersion][routeName])
  }
}

// Core routes
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
app.use('/docs', require('./core/_docs'))
app.use('/v1', require('./noncore/v1/info'))
app.use(require('./core/info'))

// Catch errors
const { notFound, exceptionOccurred } = require('./common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
