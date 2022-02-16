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
    let body = req.body
    // shorten long detections body request
    if (/streams\/([a-zA-Z]|\d)+\/detections/.test(req.url) && req.body.length > 5) {
      const totalLength = body.length
      body = body.slice(0, 5)
      body.push(`Other ${totalLength - 5} items were cropped...`)
    }
    return `${req.method} ${res.statusCode} ${req.url} ${res.responseTime} Authorization: ${req.headers.authorization} ${JSON.stringify(body)}`
  },
  expressFormat: false,
  statusLevels: true
})
