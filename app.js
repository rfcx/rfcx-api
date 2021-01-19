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
app.use(require('./middleware/logging'))
app.use(require('./middleware/toobusy'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(multer(require('./config/multer').config(process.env)))
app.use(passport.initialize())

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })
app.use(metricsMiddleware)

const routeMiddleware = require('./middleware/route')
const { authenticate } = require('./middleware/authorization/authorization')

const versionedRoutes = process.env.DEV_CORE_ONLY === 'true' ? {} : {
  v1: require('./routes/v1/routes'),
  v2: require('./routes/v2/routes')
}
for (const apiVersion in versionedRoutes) {
  app.use(`/${apiVersion}`, routeMiddleware)
}
for (const apiVersion in versionedRoutes) {
  for (const routeName in versionedRoutes[apiVersion]) {
    app.use(`/${apiVersion}/${routeName}`, versionedRoutes[apiVersion][routeName])
  }
}

const coreRoutes = require('./routes/core/routes')
const internalRoutes = require('./routes/internal/routes')
const publicRoutes = require('./routes/public/routes')
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
for (const routeName in publicRoutes) {
  app.use(`/public/${routeName}`, routeMiddleware)
  for (const route in publicRoutes[routeName]) {
    app.use(`/public/${routeName}`, publicRoutes[routeName][route])
  }
}

// Enable documentation
app.use('/docs', require('./docs'))

// Default and health check routes
app.use(require('./routes/info'))

// Catch errors
const { notFound, exceptionOccurred } = require('./middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
