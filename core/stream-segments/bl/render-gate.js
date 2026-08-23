/**
 * Pre-warm render shedding -- the SERVER half of 429 backpressure.
 * (rfcx-local, 2026-08-23. Design ledger:
 *  runbooks/evidence/media-api-prewarm-shed-design-2026-08-22.md)
 *
 * WHAT THIS PROTECTS
 * A cache MISS on /internal/assets/streams runs a real render (ffmpeg + sox +
 * imagemagick): measured cold p50 287ms costing ~300m CPU per render-second,
 * against a pod limit of 2 CPU. The ROI pre-warm plane can enqueue hundreds of
 * thousands of ROIs, so without a gate a large analysis job competes with the
 * frontend for exactly the CPU that makes the frontend feel fast.
 *
 * The operator's requirement is that media-api "comfortably serve the frontend
 * application (which can include request storms) while simultaneously
 * supporting ongoing large queues of prewarm requests". This module is the
 * mechanism: when a pod is already busy rendering, pre-warm renders are shed
 * with 429 + Retry-After, and the pre-warm consumer defers them. User traffic
 * is NEVER shed.
 *
 * 🔴 WHY PER-PROCESS AND NOT A SHARED (redis) BUCKET
 * The sibling ROI limiter in rfcx-local HAD to be shared, because it enforces a
 * global operator budget ("N renders/sec across the fleet"). This gate answers
 * a DIFFERENT question -- "is THIS pod too busy right now?" -- which is
 * inherently per-pod:
 *   * the CPU being protected is the pod's own cgroup (limit 2 CPU);
 *   * an idle pod SHOULD accept work while a sibling is hot;
 *   * the load balancer already spreads requests, so per-pod shedding sheds
 *     from whichever pod is actually loaded.
 * A shared counter would be strictly worse: it sheds on an idle pod because a
 * different pod is busy, and it puts a redis round trip on the UX-blocking path
 * to answer a question the pod can already answer locally, for free.
 * Reusing the shared-limiter pattern here would have been the wrong answer to a
 * same-shaped problem.
 *
 * 🔴 WHY THIS KEYS ON A HEADER AND *NOT* ON `systemUser`
 * The obvious discriminator was the warmer's `systemUser` role, which media-api
 * already computes. It is TOO COARSE -- `hasRole(['systemUser'])` also gates:
 *     core/internal/ingest/index.js        <- the audio UPLOAD path
 *     core/stream-source-files/index.js    <- DELETE
 *     core/internal/prediction/*.js
 *     core/internal/auth0/users.js
 * so shedding on the role would SHED INGEST under load -- far worse than the
 * problem being solved. On this very route the same flag is also an
 * AUTHORIZATION input (streams.js: `is_super || has_system_role ||
 * has_stream_token` decides `readableBy`), and coupling load-shedding to the
 * permission model is how a surprising security bug gets made. `isMachineClient`
 * has the same over-breadth.
 *
 * ⚠️ THEREFORE: `RFCx-Prewarm` is a shed-ELIGIBILITY hint ONLY. It must NEVER be
 * an authorization input. Forging it can cost the sender throughput; it can
 * never grant access. Fail-safe direction is absence => user traffic => never
 * shed.
 *
 * WHAT COUNTS AS "IN FLIGHT"
 * The counter means RENDERS in flight, not WORK in flight. generateFile()'s
 * cache writeback is deliberately fire-and-forget AFTER the response streams
 * (`uploadCachedFiles(...).catch().finally()`), so a naive "decrement when the
 * response ends" would under-count. The counter is released when generateFile()
 * resolves, which is the end of the CPU-expensive phase.
 *
 * A cache HIT is never gated: it costs a proxied read (measured warm p50 43ms),
 * it is the outcome pre-warming exists to produce, and shedding it would make
 * the plane fight itself.
 */

// Max concurrent renders per pod before pre-warm traffic is shed.
// <= 0 disables shedding entirely (fail-open).
//
// Sizing (from the design ledger): tier=media is 3 nodes x 6 CPU = 18 CPU
// dedicated, running 6 media-api replicas.
//     1 render/pod ->  6 fleet ~ 10% of tier
//     2            -> 12       ~ 20%   <- default, deliberately conservative
//     3            -> 18       ~ 30%
//     4            -> 24       ~ 40%
// ⚠️ Those come from n=8 SERIAL renders on an IDLE tier with no competing user
// traffic. Not a soak. Re-measure under real load before raising this.
const DEFAULT_MAX_INFLIGHT = 2

// Seconds advertised in Retry-After when shedding. The consumer clamps any
// Retry-After to 15s and spends a 45s in-process budget before re-publishing
// the remainder, so this wants to be small enough that a few retries fit inside
// that budget.
const DEFAULT_RETRY_AFTER = 5

// Aggregate shed logging: one line at most this often, with the counts since
// the previous line. Logging every shed would be the loudest line in the log
// during exactly the storm it is reporting on.
const LOG_INTERVAL_MS = 10000

let inFlight = 0
let shedSinceLastLog = 0
let admittedSinceLastLog = 0
let lastLogAt = 0

function intFromEnv (name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === null || `${raw}`.trim() === '') {
    return fallback
  }
  const parsed = Number.parseInt(`${raw}`.trim(), 10)
  // A malformed value must not silently disable the protection (or, worse,
  // shed everything) -- fall back to the documented default.
  return Number.isFinite(parsed) ? parsed : fallback
}

function maxInFlight () {
  return intFromEnv('MEDIA_RENDER_SHED_MAX_INFLIGHT', DEFAULT_MAX_INFLIGHT)
}

function retryAfterSeconds () {
  const secs = intFromEnv('MEDIA_RENDER_SHED_RETRY_AFTER', DEFAULT_RETRY_AFTER)
  return secs > 0 ? secs : DEFAULT_RETRY_AFTER
}

/**
 * Is this request eligible to be shed?
 *
 * TRUE only when the caller explicitly marked itself as pre-warm traffic.
 * Anything else -- a browser, a mobile client, ingest, prediction, a request
 * with no headers at all -- is user traffic and is admitted unconditionally.
 *
 * `0` and `false` are honoured as opt-outs so the marker can be turned off by
 * a caller without removing the header plumbing.
 */
function isPrewarmRequest (req) {
  if (!req) {
    return false
  }
  // req.get() is Express; fall back to raw headers so this is unit-testable
  // and robust if called with a plain object.
  let value
  if (typeof req.get === 'function') {
    value = req.get('RFCx-Prewarm')
  } else if (req.headers) {
    value = req.headers['rfcx-prewarm'] !== undefined
      ? req.headers['rfcx-prewarm']
      : req.headers['RFCx-Prewarm']
  }
  if (value === undefined || value === null) {
    return false
  }
  const normalised = `${value}`.trim().toLowerCase()
  if (normalised === '' || normalised === '0' || normalised === 'false') {
    return false
  }
  return true
}

function maybeLog (force) {
  const now = Date.now()
  if (!force && now - lastLogAt < LOG_INTERVAL_MS) {
    return
  }
  if (shedSinceLastLog === 0) {
    return
  }
  // Shedding is invisible unless it is reported. This is the only signal that
  // distinguishes "pre-warm is slow" from "pre-warm is being throttled".
  console.info(
    `media-render-gate: shed ${shedSinceLastLog} pre-warm render(s), ` +
    `admitted ${admittedSinceLastLog}, inFlight=${inFlight}/${maxInFlight()}`
  )
  lastLogAt = now
  shedSinceLastLog = 0
  admittedSinceLastLog = 0
}

/**
 * Decide whether to shed, WITHOUT reserving a slot.
 *
 * Returns { shed: boolean, retryAfter: number, inFlight: number, limit: number }
 * Call this only on the cache-MISS path; a HIT must never be shed.
 */
function shouldShed (req) {
  const limit = maxInFlight()
  const current = inFlight
  if (limit <= 0) {
    return { shed: false, retryAfter: 0, inFlight: current, limit }
  }
  if (!isPrewarmRequest(req)) {
    return { shed: false, retryAfter: 0, inFlight: current, limit }
  }
  if (current < limit) {
    return { shed: false, retryAfter: 0, inFlight: current, limit }
  }
  return { shed: true, retryAfter: retryAfterSeconds(), inFlight: current, limit }
}

/**
 * Reserve a render slot. Every successful call MUST be paired with release()
 * in a `finally`, or the pod leaks capacity and eventually sheds all pre-warm
 * traffic forever.
 */
function acquire () {
  inFlight += 1
  admittedSinceLastLog += 1
  return inFlight
}

/**
 * Reserve a slot that is released EXACTLY ONCE, whichever happens first:
 * the caller's own `finally`, or the request/response terminating.
 *
 * 🔴 WHY THIS EXISTS -- A MEASURED PRODUCTION LEAK (2026-08-23)
 * Wrapping `generateFile()` in try/finally is NOT sufficient on its own,
 * because `generateFile()` can never settle. It awaits
 * `audioUtils.serveAudioFromFile()`, whose promise resolves ONLY on the read
 * stream's `end` event (noncore/_utils/rfcx-audio/audio-serve.js) -- there is
 * no `error` handler and no abort handling. If the client goes away
 * mid-response (socket closed, timeout, page navigation, a pre-warm consumer
 * hitting its own timeout), `end` never fires, the promise never settles, the
 * `finally` never runs, and the slot is held FOREVER.
 *
 * Observed live on media-api pod .219: after ~10 aborted renders the counter
 * sat at `inFlight=4/2` and the pod shed EVERY pre-warm request indefinitely --
 * still shedding 65+ seconds after all load stopped, with an otherwise idle
 * pod. A controlled A/B against a sibling pod (identical requests, bodies
 * fully drained) returned cleanly to 0 and served 200s. That is the proof the
 * leak is caused by client disconnect, not by render failure.
 *
 * The failure mode is silent and permanent-until-restart, and it degrades
 * exactly the thing this gate exists to protect: it does NOT hurt users (they
 * are never shed) but it silently stops all pre-warming on that pod, which
 * would look like "pre-warm is mysteriously slow" long after the cause.
 *
 * Idempotence is the whole contract here: `res` may emit both `close` and
 * `finish`, and the caller's `finally` may also fire, so a naive listener
 * would double-release and drive the counter negative -- which silently RAISES
 * the effective limit (the mirror-image bug).
 */
function acquireForRequest (req, res) {
  acquire()
  let released = false
  const releaseOnce = () => {
    if (released) {
      return
    }
    released = true
    if (res && typeof res.removeListener === 'function') {
      res.removeListener('close', releaseOnce)
      res.removeListener('finish', releaseOnce)
    }
    release()
  }
  // 'close' fires on abort AND on normal completion in modern Node; 'finish'
  // covers a fully-flushed response. Both are guarded by `released`.
  if (res && typeof res.on === 'function') {
    res.on('close', releaseOnce)
    res.on('finish', releaseOnce)
  }
  return releaseOnce
}

function release () {
  inFlight -= 1
  // Defensive: a double-release would drive this negative and silently raise
  // the effective limit. Clamp and keep serving.
  if (inFlight < 0) {
    inFlight = 0
  }
  maybeLog(false)
  return inFlight
}

/**
 * Apply the gate to a response. Returns true when the request was shed (and the
 * response has been completed), false when the caller should proceed to render.
 */
function shedIfBusy (req, res) {
  const decision = shouldShed(req)
  if (!decision.shed) {
    return false
  }
  shedSinceLastLog += 1
  res.setHeader('Retry-After', `${decision.retryAfter}`)
  // Make the reason legible to a human reading a response, and to the consumer
  // logs. Not load-bearing -- the consumer keys on the 429 status.
  res.setHeader('RFCx-Shed-Reason', 'render-concurrency')
  res.setHeader('Access-Control-Expose-Headers', 'Retry-After, RFCx-Shed-Reason')
  maybeLog(true)
  res.status(429).end()
  return true
}

// Test/observability seam. Not used by request handling.
function stats () {
  return { inFlight, limit: maxInFlight(), retryAfter: retryAfterSeconds() }
}

function resetForTest () {
  inFlight = 0
  shedSinceLastLog = 0
  admittedSinceLastLog = 0
  lastLogAt = 0
}

module.exports = {
  isPrewarmRequest,
  shouldShed,
  shedIfBusy,
  acquire,
  acquireForRequest,
  release,
  stats,
  resetForTest,
  DEFAULT_MAX_INFLIGHT,
  DEFAULT_RETRY_AFTER
}
