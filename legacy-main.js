console.log('Legacy: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('./common/error-handling/process')

// Check required env vars are set
require('./common/config/inspector')

// Load application
const app = require('./legacy-app')

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Legacy: Started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})
