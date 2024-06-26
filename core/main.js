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

async function handle (signal) {
  emergencyLogger.error(`Received SIGNAL ${signal}, exiting`)

  // we wait for it here, so that request that transfer data right now
  // can finish it and not fail
  await new Promise((resolve) => {
    setTimeout(resolve, 1500)
  })

  server.close(async (error) => {
    if (error) {
      emergencyLogger.error(`Failed to gracefully shutdown server with error ${error.stack}`)
      process.exit(1)
    }
    emergencyLogger.info(`On SIGNAL ${signal} succesfully closed the server`)

    await sequelize.close()

    emergencyLogger.info(`On SIGNAL ${signal} Succesfully closed the sequelize`)

    process.exit()
  })
}

process.on('SIGINT', handle)
process.on('SIGTERM', handle)
