/**
 * per-principal.js — tiny, dependency-free, in-memory sliding-window rate
 * limiter keyed on the authenticated principal (user id / guid).
 *
 * Motivation: a single authenticated principal (an SDK/M2M client) was able to
 * pull whole public-stream audio archives via the segment-file endpoint at
 * several requests/second with no server-side ceiling. This applies a fair,
 * per-principal cap so any one caller cannot monopolise the endpoint, without
 * allow/deny lists and without affecting other users.
 *
 * Notes / limitations:
 *  - In-memory and per-process. rfcx-api runs multiple replicas, so the
 *    effective fleet ceiling is `max` * replicaCount. That is acceptable here
 *    (the goal is to stop runaway single-client bulk pulls, not to enforce an
 *    exact global quota). For a strict global limit, back this with Redis.
 *  - Window state is pruned lazily; memory stays bounded by active principals.
 */

function createPerPrincipalRateLimit ({ windowMs = 60000, max = 60, message } = {}) {
  const hits = new Map() // key -> array of request timestamps (ms)

  return function perPrincipalRateLimit (req, res, next) {
    const info = (req.rfcx && req.rfcx.auth_token_info) || {}
    // Super users and internal system-role callers bypass the limit.
    if (info.is_super || info.has_system_role) {
      return next()
    }
    const key = String(info.id || info.guid || req.headers['cf-connecting-ip'] || req.ip || 'anonymous')

    const now = Date.now()
    const windowStart = now - windowMs
    const arr = (hits.get(key) || []).filter(ts => ts > windowStart)

    if (arr.length >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((arr[0] + windowMs - now) / 1000))
      res.set('Retry-After', String(retryAfterSec))
      hits.set(key, arr) // keep pruned window
      return res.status(429).json({
        message: message || 'Too many requests for this resource. Please slow down.',
        error: { status: 429 }
      })
    }

    arr.push(now)
    hits.set(key, arr)

    // Opportunistic global prune so the Map doesn't grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        const pruned = v.filter(ts => ts > windowStart)
        if (pruned.length === 0) {
          hits.delete(k)
        } else {
          hits.set(k, pruned)
        }
      }
    }

    return next()
  }
}

module.exports = { createPerPrincipalRateLimit }
