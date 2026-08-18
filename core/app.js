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
const passport = require('passport')

const app = express()

app.use(addRequestId({ attributeName: 'guid' }))
app.use(cors()) // TODO Should we limit which routes need cors?
app.use(logging, metrics)
app.use(urlEncoded, json, multipartFile.any())
app.use(passport.initialize())

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

// Webhook routes (handle their own auth; no framework-level JWT wrapper)
app.use('/webhooks', require('./webhooks'))

// Public image resize (rfcx-local, 2026-08-17). Mounted OUTSIDE the
// authenticate() wrappers above, like /webhooks, and for a comparable reason:
// its consumers are bare <img src> tags in the web app, which cannot send an
// Authorization header.
//
// WHY THIS IS SAFE, and why the alternative was not:
//   * It serves ONLY buckets that are ALREADY public. The source objects are
//     anonymous-download and CF-cached, reachable right now at
//     https://s3.arbimon.org/arbimon-profile/... with no credential at all.
//     Authenticating a resized copy of a public byte-for-byte-readable image
//     would buy nothing while breaking every <img> that consumes it.
//   * The `stream-token` strategy CANNOT authenticate this route even in
//     principle: it authorises a stream + time WINDOW and parses those from a
//     `/internal/assets/streams/` filename (see
//     common/middleware/passport-stream-token/service.js). A profile image has
//     no stream and no time range, so the strategy's own guard
//     (`if (!stream || !start || !end)`) rejects -- and that path surfaces as a
//     500, not a 401. Mounting this under /internal/ therefore made it
//     unreachable by design, not merely inconvenient.
//   * Read-only, whitelisted source buckets, bounded+quantised dimensions, and
//     `refresh` refused in-app (see the route) -- so being public does not make
//     it an amplifier.
app.use('/images', require('./images'))

// Support routes
app.use(require('./info'))
app.use('/docs', require('./_docs'))

// Catch errors
const { notFound, exceptionOccurred } = require('../common/middleware/error')
app.use(notFound) // Last route, catches all
app.use(exceptionOccurred) // Catches all errors (including 404)

module.exports = app
