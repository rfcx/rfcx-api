/**
 * Unit assertions for the pre-warm render gate (rfcx-local, 2026-08-23).
 *
 * The acceptance criteria these encode come from
 * runbooks/session-prompts/MEDIA-API-SHEDDING-2026-08-22.md:
 *   * a RFCx-Prewarm request under load gets 429 + Retry-After
 *   * an identical request WITHOUT the header never gets 429
 *   * a cache hit is never shed (covered in segment-file-utils.int.test.js)
 *   * no ingest/prediction traffic is ever shed -- asserted explicitly below
 */
const renderGate = require('./render-gate')

// Minimal Express-ish response double: records what the gate did to it.
function mockRes () {
  return {
    headers: {},
    statusCode: null,
    ended: false,
    setHeader (k, v) { this.headers[k] = v },
    status (code) { this.statusCode = code; return this },
    end () { this.ended = true; return this }
  }
}

// Express exposes req.get() with case-insensitive lookup.
function mockReq (headers = {}) {
  const lower = {}
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k]
  }
  return {
    headers: lower,
    get (name) { return lower[String(name).toLowerCase()] }
  }
}

describe('render-gate', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    renderGate.resetForTest()
    delete process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT
    delete process.env.MEDIA_RENDER_SHED_RETRY_AFTER
  })

  afterAll(() => {
    process.env = savedEnv
  })

  describe('isPrewarmRequest', () => {
    test('true only when the marker is present and truthy', () => {
      expect(renderGate.isPrewarmRequest(mockReq({ 'RFCx-Prewarm': '1' }))).toBe(true)
      expect(renderGate.isPrewarmRequest(mockReq({ 'rfcx-prewarm': '1' }))).toBe(true)
    })

    test('absence means user traffic (fail-safe)', () => {
      expect(renderGate.isPrewarmRequest(mockReq({}))).toBe(false)
      expect(renderGate.isPrewarmRequest(mockReq({ authorization: 'Bearer x' }))).toBe(false)
      expect(renderGate.isPrewarmRequest(undefined)).toBe(false)
      expect(renderGate.isPrewarmRequest({})).toBe(false)
    })

    test('explicit opt-out values are honoured', () => {
      expect(renderGate.isPrewarmRequest(mockReq({ 'RFCx-Prewarm': '0' }))).toBe(false)
      expect(renderGate.isPrewarmRequest(mockReq({ 'RFCx-Prewarm': 'false' }))).toBe(false)
      expect(renderGate.isPrewarmRequest(mockReq({ 'RFCx-Prewarm': '' }))).toBe(false)
    })

    test('works without Express req.get()', () => {
      expect(renderGate.isPrewarmRequest({ headers: { 'rfcx-prewarm': '1' } })).toBe(true)
    })
  })

  describe('shedding decisions', () => {
    test('pre-warm is admitted while below the limit', () => {
      const req = mockReq({ 'RFCx-Prewarm': '1' })
      expect(renderGate.shouldShed(req).shed).toBe(false)
      renderGate.acquire()
      expect(renderGate.shouldShed(req).shed).toBe(false)
    })

    test('pre-warm is shed at the limit, with a positive Retry-After', () => {
      const req = mockReq({ 'RFCx-Prewarm': '1' })
      renderGate.acquire()
      renderGate.acquire() // default limit is 2
      const decision = renderGate.shouldShed(req)
      expect(decision.shed).toBe(true)
      expect(decision.retryAfter).toBeGreaterThan(0)
    })

    test('🔴 user traffic is NEVER shed, however loaded the pod is', () => {
      for (let i = 0; i < 50; i++) {
        renderGate.acquire()
      }
      expect(renderGate.shouldShed(mockReq({})).shed).toBe(false)
      expect(renderGate.shouldShed(mockReq({ authorization: 'Bearer user' })).shed).toBe(false)
    })

    test('🔴 ingest/prediction machine traffic is never shed', () => {
      for (let i = 0; i < 50; i++) {
        renderGate.acquire()
      }
      // These callers authenticate with the systemUser role -- the
      // discriminator this gate deliberately does NOT use. Without the
      // pre-warm marker they must be indistinguishable from user traffic.
      const ingest = mockReq({ authorization: 'Bearer system-token' })
      const prediction = mockReq({ authorization: 'Bearer system-token', 'user-agent': 'prediction-service' })
      expect(renderGate.shouldShed(ingest).shed).toBe(false)
      expect(renderGate.shouldShed(prediction).shed).toBe(false)
    })

    test('releasing restores capacity', () => {
      const req = mockReq({ 'RFCx-Prewarm': '1' })
      renderGate.acquire()
      renderGate.acquire()
      expect(renderGate.shouldShed(req).shed).toBe(true)
      renderGate.release()
      expect(renderGate.shouldShed(req).shed).toBe(false)
    })

    test('release cannot drive the counter negative', () => {
      renderGate.release()
      renderGate.release()
      expect(renderGate.stats().inFlight).toBe(0)
      // A negative counter would silently RAISE the effective limit.
      renderGate.acquire()
      renderGate.acquire()
      expect(renderGate.shouldShed(mockReq({ 'RFCx-Prewarm': '1' })).shed).toBe(true)
    })
  })

  describe('configuration', () => {
    test('limit is configurable', () => {
      process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT = '4'
      const req = mockReq({ 'RFCx-Prewarm': '1' })
      for (let i = 0; i < 3; i++) {
        renderGate.acquire()
      }
      expect(renderGate.shouldShed(req).shed).toBe(false)
      renderGate.acquire()
      expect(renderGate.shouldShed(req).shed).toBe(true)
    })

    test('a limit of 0 disables shedding (fail-open)', () => {
      process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT = '0'
      for (let i = 0; i < 20; i++) {
        renderGate.acquire()
      }
      expect(renderGate.shouldShed(mockReq({ 'RFCx-Prewarm': '1' })).shed).toBe(false)
    })

    test('a malformed limit falls back to the default, it does not disable or shed-all', () => {
      process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT = 'not-a-number'
      const req = mockReq({ 'RFCx-Prewarm': '1' })
      renderGate.acquire()
      expect(renderGate.shouldShed(req).shed).toBe(false)
      renderGate.acquire()
      expect(renderGate.shouldShed(req).shed).toBe(true)
      expect(renderGate.stats().limit).toBe(renderGate.DEFAULT_MAX_INFLIGHT)
    })

    test('Retry-After is configurable and never non-positive', () => {
      process.env.MEDIA_RENDER_SHED_RETRY_AFTER = '9'
      expect(renderGate.stats().retryAfter).toBe(9)
      process.env.MEDIA_RENDER_SHED_RETRY_AFTER = '0'
      expect(renderGate.stats().retryAfter).toBe(renderGate.DEFAULT_RETRY_AFTER)
      process.env.MEDIA_RENDER_SHED_RETRY_AFTER = '-3'
      expect(renderGate.stats().retryAfter).toBe(renderGate.DEFAULT_RETRY_AFTER)
    })
  })

  describe('shedIfBusy response shape', () => {
    test('sheds with 429 + Retry-After and ends the response', () => {
      renderGate.acquire()
      renderGate.acquire()
      const res = mockRes()
      const shed = renderGate.shedIfBusy(mockReq({ 'RFCx-Prewarm': '1' }), res)
      expect(shed).toBe(true)
      expect(res.statusCode).toBe(429)
      expect(res.ended).toBe(true)
      expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
      // The consumer clamps Retry-After to 15s; advertising more would just be
      // silently truncated.
      expect(Number(res.headers['Retry-After'])).toBeLessThanOrEqual(15)
    })

    test('does not touch the response when admitting', () => {
      const res = mockRes()
      const shed = renderGate.shedIfBusy(mockReq({ 'RFCx-Prewarm': '1' }), res)
      expect(shed).toBe(false)
      expect(res.statusCode).toBeNull()
      expect(res.ended).toBe(false)
      expect(res.headers['Retry-After']).toBeUndefined()
    })
  })
})
