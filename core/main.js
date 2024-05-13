console.info('info: Core: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('../common/error-handling/process')

// Check required env vars are set
require('../common/config')

// must initialize config before requiring sequelize
const { sequelize } = require('./_models')

const winston = require('winston')
// Load application
const app = require('./app')

// Serve
const port = process.env.PORT || 8080
const server = app.listen(port, () => {
  console.info(`info: Core: Started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})

server.keepAliveTimeout = 61 * 1000
server.headersTimeout = 70 * 1000 // This should be bigger than `keepAliveTimeout + your server's expected response time`

const emergencyLogger = winston.createLogger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.simple()
  )
})

process.on('unhandledRejection', (reason, p) => {
  emergencyLogger.error('Unhandled Rejection at:', p, 'reason:', reason)

  process.exit(1)
})

process.on('uncaughtException', (error) => {
  emergencyLogger.error(`Uncaught exception: ${error.stack}`)

  process.exit(1)
})

function handle (signal) {
  emergencyLogger.error(`Received ${signal}, exiting`)

  server.close((error) => {
    if (error) {
      emergencyLogger.error(`Failed to gracefully shutdown server with error ${error.stack}`)
      process.exit(1)
    }

    sequelize.close()

    process.exit()
  })
}

process.on('SIGINT', handle)
process.on('SIGTERM', handle)
