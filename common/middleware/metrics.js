// New Relic was removed 2026-09-08: the vendor is no longer used and we hold no
// credentials for the account. The agent was loading in every production pod
// (NODE_ENV=production), which meant workloads WITH a licence key were silently
// shipping telemetry to a third party, while those without one logged
// "Not starting without license key!" on every start.
//
// Nothing is lost by removing it: the Prometheus middleware below is exported
// by this same file and already serves http_request_duration_seconds on
// /metrics. (Note: as of removal, no ServiceMonitor scrapes core-api/media-api,
// so those metrics are exposed but uncollected -- tracked separately; that gap
// predates this change and is not caused by it.)

// Prometheus
const promBundle = require('express-prom-bundle')
const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })

module.exports = metricsMiddleware
