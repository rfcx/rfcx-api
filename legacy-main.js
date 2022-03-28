console.info('info: Legacy: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('./common/error-handling/process')

// Check required env vars are set
require('./common/config')

// Load application
const app = require('./legacy-app')

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.info(`info: Legacy: Started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})
