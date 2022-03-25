console.info('info: MQTT: Starting...')
const startTime = new Date()

// Handle unhandled promises
require('../common/error-handling/process')

// Load application
const appHttp = require('./app-http')
const appMqtt = require('./app-mqtt')

// Start
appMqtt.listen()
const port = process.env.PORT || 8080
appHttp.listen(port, () => {
  console.info(`info: MQTT: Http server started ${new Date() - startTime}ms (port ${port}) (env ${process.env.NODE_ENV})`)
})
