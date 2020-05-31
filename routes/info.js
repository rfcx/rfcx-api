const router = require("express").Router()
const { healthCheck } = require("../utils/internal-rfcx/health-check.js")
const packageData = require('../package.json')

// Health Check Endpoint
router.get("/health_check", function (req, res) { healthCheck.httpResponse(req, res); })

// Default Endpoint
router.get('/', function (req, res) {
  res.status(200).json({
    name: 'Rainforest Connection (RFCx)',
    message: 'Access to this API requires authentication. Please send requests for access by email to contact@rfcx.org',
    info: 'https://rfcx.org/'
  })
})

router.get('/app-info', (req, res) => {
  res.status(200).json({
    node: process.version,
    app: packageData.version
  })
})

module.exports = router