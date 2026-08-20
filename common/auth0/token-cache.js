'use strict'

/**
 * In-memory cache for Auth0 machine-to-machine tokens.
 *
 * History: the previous inline implementation computed
 * `expires_at = Date.now() + token.expires_in` — but OAuth 2.0 `expires_in`
 * is SECONDS (RFC 6749 §5.1) while `Date.now()` is milliseconds, so an
 * 86400-second token was treated as stale ~81 seconds after issue and a
 * 3600-second token was stale immediately. Every internal call hit
 * /oauth/token, and any Auth0 blip became a caller-visible failure
 * (observed 2026-08-19: core-api 500s on the ingest path → DLQ growth).
 *
 * This cache:
 *  - stores expiry in ms (`expires_in * 1000`)
 *  - refreshes early (margin) but serves the still-valid cached token
 *    immediately while refreshing in the background (stale-while-revalidate)
 *  - retries a failed refresh a bounded number of times
 *  - deduplicates concurrent refreshes (single in-flight request per type)
 *  - preserves the underlying error as `cause` instead of discarding it
 *
 * Dependencies (clock, delay) are injectable for deterministic unit tests.
 */

const DEFAULT_REFRESH_MARGIN_MS = 30 * 1000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 500

function defaultDelay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function createTokenCache (options = {}) {
  const now = options.now || (() => Date.now())
  const delay = options.delay || defaultDelay
  const refreshMarginMs = options.refreshMarginMs !== undefined ? options.refreshMarginMs : DEFAULT_REFRESH_MARGIN_MS
  const maxAttempts = options.maxAttempts !== undefined ? options.maxAttempts : DEFAULT_MAX_ATTEMPTS
  const retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : DEFAULT_RETRY_DELAY_MS
  const onRefresh = options.onRefresh || (() => {})
  const onError = options.onError || (() => {})

  const tokens = {}
  const inflight = {}

  async function refresh (type, requestFunc) {
    let lastError
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const token = await requestFunc()
        if (!token || !token.access_token) {
          throw new Error(`Empty token response for Auth0 "${type}" token`)
        }
        const expiresInSeconds = Number(token.expires_in)
        const lifetimeMs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds * 1000 : 0
        tokens[type] = { ...token, expires_at: now() + lifetimeMs }
        onRefresh(type, attempt)
        return tokens[type].access_token
      } catch (e) {
        lastError = e
        if (attempt < maxAttempts) {
          await delay(retryDelayMs)
        }
      }
    }
    throw new Error(`Unable to get Auth0 "${type}" token`, { cause: lastError })
  }

  /**
   * Return a valid access token for `type`, requesting a new one via
   * `requestFunc` only when the cached token is missing or near expiry.
   */
  async function getAccessToken (type, requestFunc) {
    const cached = tokens[type]
    const t = now()
    const stillValid = !!cached && cached.expires_at > t
    const fresh = stillValid && cached.expires_at - t >= refreshMarginMs
    if (fresh) {
      return cached.access_token
    }
    if (!inflight[type]) {
      inflight[type] = refresh(type, requestFunc).finally(() => { delete inflight[type] })
    }
    if (stillValid) {
      // Inside the refresh margin but not expired: serve the cached token
      // immediately and let the refresh complete in the background. A failed
      // background refresh must not surface as an unhandled rejection.
      inflight[type].catch(err => onError(type, err))
      return cached.access_token
    }
    return inflight[type]
  }

  /** Test-only: inspect or clear cached state. */
  function _peek (type) {
    return tokens[type]
  }
  function _clear () {
    for (const key of Object.keys(tokens)) {
      delete tokens[key]
    }
  }

  return { getAccessToken, _peek, _clear }
}

module.exports = {
  createTokenCache,
  DEFAULT_REFRESH_MARGIN_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_DELAY_MS
}
