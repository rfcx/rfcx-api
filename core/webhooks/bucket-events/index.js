const express = require('express')
const router = express.Router()
const { authenticateBucketEventWebhook } = require('./auth')

// Body is parsed by the global json middleware (common/middleware/body-parsing.js),
// which also stashes the raw bytes on req.rawBody so the HMAC middleware
// can verify Cloudflare's webhook signatures.
router.post('/object-created', authenticateBucketEventWebhook, require('./object-created'))

module.exports = router
