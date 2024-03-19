console.info('info: Core: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('../common/error-handling/process')

// Check required env vars are set
require('../common/config')

// Load application
const app = require('./app')

// Serve
const port = process.env.PORT || 8080
const server = app.listen(port, () => {
  console.info(`info: Core: Started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})

server.keepAliveTimeout = 61 * 1000
server.headersTimeout = 70 * 1000 // This should be bigger than `keepAliveTimeout + your server's expected response time`
