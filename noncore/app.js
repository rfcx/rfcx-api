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
app.use(require('../middleware/logging'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(multer(require('../common/config/multer').config(process.env)))
app.use(passport.initialize())

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })
app.use(metricsMiddleware)

const routeMiddleware = require('../middleware/route')

const versionedRoutes = process.env.DEV_CORE_ONLY === 'true'
  ? {}
  : {
      v1: require('./v1/routes'),
      v2: require('./v2/routes')
    }
for (const apiVersion in versionedRoutes) {
  app.use(`/${apiVersion}`, routeMiddleware)
}
for (const apiVersion in versionedRoutes) {
  for (const routeName in versionedRoutes[apiVersion]) {
    app.use(`/${apiVersion}/${routeName}`, versionedRoutes[apiVersion][routeName])
  }
}

// Default and health check routes
app.use(require('./info'))

// Catch errors
const { notFound, exceptionOccurred } = require('../middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
