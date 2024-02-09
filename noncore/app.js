const express = require('express')
const cors = require('cors')
const addRequestId = require('express-request-id')

const logging = require('../common/middleware/logging')
const metrics = require('../common/middleware/metrics')
const { urlEncoded, json, multipartFile } = require('../common/middleware/body-parsing')
const routeMiddleware = require('../common/middleware/route')
const v1Routes = require('./v1/routes')
const v2Routes = require('./v2/routes')
const passport = require('passport')

const app = express()

// Middleware
app.use(addRequestId({ attributeName: 'guid' }))
app.use(cors())
app.use(logging, metrics)
app.use(urlEncoded, json, multipartFile.any())
app.use(passport.initialize())

// Main routes
const versionedRoutes = { v1: v1Routes, v2: v2Routes }
for (const apiVersion in versionedRoutes) {
  app.use(`/${apiVersion}`, routeMiddleware)
}
for (const apiVersion in versionedRoutes) {
  for (const routeName in versionedRoutes[apiVersion]) {
    app.use(`/${apiVersion}/${routeName}`, versionedRoutes[apiVersion][routeName])
  }
}

// Support routes
app.use('/v1', require('./v1/info'))

// Catch errors
const { notFound, exceptionOccurred } = require('../common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
