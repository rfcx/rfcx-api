const express = require("express")
const path = require("path")
const favicon = require("serve-favicon")
const multer = require("multer")
const passport = require("passport")
const cors = require("cors")
const bodyParser = require("body-parser")
const addRequestId = require('express-request-id')
const { addInstanceId } = require('./middleware/misc/aws')
const packageData = require('./package.json')
const loggers = require('./utils/logger')

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

const routeMiddleware = require('./middleware/route')

var versionedRoutes = {
  v1: require('./routes/v1/routes'),
  v2: require('./routes/v2/routes')
}
const coreRoutes = require('./routes/core/routes')

for (apiVersion in versionedRoutes) {
  for (routeName in versionedRoutes[apiVersion]) {
    for (route in versionedRoutes[apiVersion][routeName]) {
      app.use("/" + apiVersion + "/" + routeName, routeMiddleware, versionedRoutes[apiVersion][routeName][route]);
    }
  }
}
for (routeName in coreRoutes) {
  for (route in coreRoutes[routeName]) {
    app.use('/' + routeName, routeMiddleware, coreRoutes[routeName][route])
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
