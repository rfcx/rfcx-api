// New Relic
if (process.env.NODE_ENV === 'production') {
  require('newrelic')
}

// Prometheus
const promBundle = require('express-prom-bundle')
const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })

module.exports = metricsMiddleware
