const express = require("express")
const path = require("path")
const favicon = require("serve-favicon")
const multer = require("multer")
const passport = require("passport")
const cors = require("cors")
const bodyParser = require("body-parser")
const addRequestId = require('express-request-id')
const { addInstanceId } = require('./middleware/misc/aws')
const loggers = require('./utils/logger')
const promBundle = require("express-prom-bundle")

const app = express()

app.set("title", "rfcx-api")
app.set("port", process.env.PORT || 8080)
app.use(addRequestId({ attributeName: 'guid' }))
app.use(addInstanceId)
app.use(favicon(__dirname + "/public/img/logo/favicon.ico"))
app.use(cors()) // TO-DO: Currently enables CORS for all requests. We may have a reason to limit this in the future...
app.use(require('./middleware/logging'))
app.use(require('./middleware/toobusy'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(multer(require("./config/multer").config(process.env)))
app.use(express.static(path.join(__dirname, "public")))
app.use(passport.initialize())

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })
app.use(metricsMiddleware)

const routeMiddleware = require('./middleware/route')

var versionedRoutes = {
  v1: require('./routes/v1/routes'),
  v2: require('./routes/v2/routes')
}
const coreRoutes = require('./routes/core/routes')
const internalRoutes = require('./routes/internal/routes')

// Routes middleware must stay on /v1 and /v2 level to keep the middleware logic valid
for (apiVersion in versionedRoutes) {
  app.use("/" + apiVersion, routeMiddleware);
}

for (apiVersion in versionedRoutes) {
  for (routeName in versionedRoutes[apiVersion]) {
    app.use("/" + apiVersion + "/" + routeName, versionedRoutes[apiVersion][routeName]);
  }
}
for (routeName in coreRoutes) {
  for (route in coreRoutes[routeName]) {
    app.use('/' + routeName, routeMiddleware, coreRoutes[routeName][route])
  }
}
for (routeName in internalRoutes) {
  for (route in internalRoutes[routeName]) {
    app.use('/internal/' + routeName, routeMiddleware, internalRoutes[routeName][route])
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
