const express = require('express')
const multer = require('multer')
const passport = require('passport')
const cors = require('cors')
const bodyParser = require('body-parser')
const addRequestId = require('express-request-id')
const promBundle = require('express-prom-bundle')

if (process.env.NODE_ENV === 'production') {
  require('newrelic')
}

const app = express()

app.set('title', 'rfcx-api')
app.set('port', process.env.PORT || 8080)
app.use(addRequestId({ attributeName: 'guid' }))
app.use(cors()) // TO-DO: Currently enables CORS for all requests. We may have a reason to limit this in the future...
app.use(require('../common/middleware/logging'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(multer(require('../common/config/multer').config(process.env)))
app.use(passport.initialize())

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })
app.use(metricsMiddleware)

const routeMiddleware = require('../common/middleware/route')
const { authenticate } = require('../common/middleware/authorization/authorization')

const coreRoutes = require('./routes')
const internalRoutes = require('./internal/routes')
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

// Enable documentation
app.use('/docs', require('./_docs'))

// Default and health check routes
app.use(require('../noncore/info'))

// Catch errors
const { notFound, exceptionOccurred } = require('../common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
