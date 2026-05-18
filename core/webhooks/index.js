/**
 * Top-level webhooks router.
 *
 * Webhooks bypass the framework's standard JWT-authenticate() wrapper
 * because external callers (Cloudflare R2 event notifications, etc.)
 * authenticate via HMAC signature, not bearer tokens. Each sub-route
 * mounts its own auth middleware.
 *
 * Mounted in core/app.js at /webhooks, OUTSIDE the per-route-group
 * authenticate() wrapper that core/internal routes get.
 */

const express = require('express')
const router = express.Router()

router.use('/bucket-events', require('./bucket-events'))

module.exports = router
