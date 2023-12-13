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

const a1 = function (req, res, next) {
  console.log('\n\n111', req.method, req.url, '\n\n')
  next()
}
const a2 = function (req, res, next) {
  console.log('\n\n222', req.method, req.url, '\n\n')
  next()
}
const a3 = function (req, res, next) {
  console.log('\n\n333', req.method, req.url, '\n\n')
  next()
}
const a4 = function (req, res, next) {
  console.log('\n\n444', req.method, req.url, '\n\n')
  next()
}
const a5 = function (req, res, next) {
  console.log('\n\n555', req.method, req.url, '\n\n')
  next()
}
const a6 = function (req, res, next) {
  console.log('\n\n666', req.method, req.url, '\n\n')
  next()
}
const a7 = function (req, res, next) {
  console.log('\n\n777', req.method, req.url, '\n\n')
  next()
}
const a8 = function (req, res, next) {
  console.log('\n\n888', req.method, req.url, '\n\n')
  next()
}
app.use(a1)
app.use(addRequestId({ attributeName: 'guid' })) // TODO Still needed?
app.use(a2)
app.use(cors()) // TODO Should we limit which routes need cors?
app.use(a3)
// app.use(logging, metrics)
app.use(logging)
app.use(a4)
app.use(metrics)
app.use(a5)
// app.use(urlEncoded, json, multipartFile)
app.use(urlEncoded)
app.use(a6)
app.use(json)
app.use(a7)
app.use(multipartFile)
app.use(a8)

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
