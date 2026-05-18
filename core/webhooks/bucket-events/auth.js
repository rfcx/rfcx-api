/**
 * Auth for bucket-event webhooks.
 *
 * Two acceptable modes per request, evaluated in order:
 *
 *   1. HMAC: header `X-Webhook-Signature: sha256=<hex>` carrying the
 *      hex-encoded HMAC-SHA256 of the raw request body, keyed with
 *      env EVENT_WEBHOOK_SECRET. Designed for Cloudflare R2 event
 *      notifications and other external callers that don't have JWTs.
 *
 *   2. Bearer JWT: a system-user JWT validated by the standard passport
 *      `jwt` strategy. Designed for internal callers (our own backfill
 *      jobs, cron, etc.). Requires the `systemUser` role.
 *
 * If either passes, the request continues. If neither passes, 403.
 *
 * EVENT_WEBHOOK_SECRET is configured via the core-api Secret (NOT in
 * the public ConfigMap). Without the env, only the JWT path is open.
 */

const crypto = require('crypto')
const passport = require('passport')
const { ForbiddenError } = require('../../../common/error-handling/errors')

const HMAC_HEADER = 'x-webhook-signature'
const HMAC_PREFIX = 'sha256='

function timingSafeEqual (a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch (e) {
    return false
  }
}

function computeHmac (secret, body) {
  return HMAC_PREFIX + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Express middleware that gates webhook endpoints.
 *
 * Reads req.rawBody (populated by the global body-parser `verify`
 * callback in common/middleware/body-parsing.js).
 */
function authenticateBucketEventWebhook (req, res, next) {
  // Mode 1: HMAC.
  const secret = process.env.EVENT_WEBHOOK_SECRET
  const signature = req.headers[HMAC_HEADER]
  if (secret && signature && req.rawBody) {
    const expected = computeHmac(secret, req.rawBody)
    if (timingSafeEqual(signature, expected)) {
      req.webhookAuthMethod = 'hmac'
      return next()
    }
  }

  // Mode 2: Bearer JWT (systemUser).
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err || !user) {
      return next(new ForbiddenError('Invalid webhook signature and no valid bearer token'))
    }
    const roles = (user && (user.roles || user['https://rfcx.org/roles'])) || []
    if (!Array.isArray(roles) || !roles.includes('systemUser')) {
      return next(new ForbiddenError('Bearer token does not carry systemUser role'))
    }
    req.user = user
    req.webhookAuthMethod = 'jwt'
    return next()
  })(req, res, next)
}

module.exports = { authenticateBucketEventWebhook, computeHmac }
