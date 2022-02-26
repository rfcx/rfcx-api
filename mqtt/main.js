console.info('MQTT: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('../common/error-handling/process')

// Check required env vars are set
require('../common/config/inspector')

// Load application
const appHttp = require('./app-http')
const appMqtt = require('./app-mqtt')

// Start
appMqtt.listen()
const port = process.env.PORT || 8080
appHttp.listen(port, () => {
  console.info(`MQTT: Http server started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})
