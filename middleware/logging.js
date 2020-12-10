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
  msg: '{{req.method}} {{res.statusCode}} {{req.url}} {{res.responseTime}} Authorization: {{req.headers.authorization}} {{Math.random()}}',
  expressFormat: false
})
