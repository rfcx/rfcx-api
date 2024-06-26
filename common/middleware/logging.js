const winston = require('winston')
const expressWinston = require('express-winston')

module.exports = expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.simple()
  ),
  meta: false,
  msg: function (req, res) {
    // stream/:id/detections receive request data as array
    // classifier receive request data as object
    // we don't want to spread array values into single object
    let body = Array.isArray(req.body) ? req.body : { ...req.body }
    // shorten long detections body request
    if (/streams\/([a-zA-Z]|\d)+\/detections/.test(req.url) && req.body.length > 5) {
      const totalLength = body.length
      body = body.slice(0, 5)
      body.push(`Other ${totalLength - 5} items were cropped...`)
    }
    if (/classifiers/.test(req.url) && req.body.classification_values && req.body.classification_values.length > 10) {
      const totalLength = body.classification_values.length
      body.classification_values = body.classification_values.slice(0, 10)
      body.classification_values.push(`Other ${totalLength - 10} items were cropped...`)
    }
    if (/internal\/classifier-jobs\/(\d+)\/results/.test(req.url) && req.body.detections && req.body.detections.length > 10) {
      const totalLength = body.detections.length
      body.detections = body.detections.slice(0, 10)
      body.detections.push(`Other ${totalLength - 10} items were cropped...`)
    }
    const userEmail = (req.rfcx && req.rfcx.auth_token_info && req.rfcx.auth_token_info.email) ? req.rfcx.auth_token_info.email : 'none'
    return `${req.method} ${res.statusCode} ${req.url} Response Time: ${res.responseTime} Authorization: ${req.headers.authorization} Email: ${userEmail} Body: ${JSON.stringify(body)}`
  },
  expressFormat: false,
  statusLevels: true
})
