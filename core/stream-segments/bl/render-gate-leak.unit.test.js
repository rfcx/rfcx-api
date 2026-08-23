/**
 * Regression assertions for the render-slot LEAK found in production
 * (rfcx-local, 2026-08-23).
 *
 * THE BUG: getFile() wrapped generateFile() in try/finally, which looks
 * airtight. It is not -- generateFile() awaits serveAudioFromFile(), whose
 * promise resolves ONLY on the read stream's `end` event. When a client
 * disconnects mid-response `end` never fires, the promise never settles, the
 * `finally` never runs, and the slot is held until the process restarts.
 *
 * Measured live: media-api pod .219 wedged at inFlight=4/2 and shed EVERY
 * pre-warm request, still shedding 65+ s after all load stopped. A sibling pod
 * receiving identical-but-fully-drained requests returned to 0 and served 200s.
 *
 * WHY THE ORIGINAL SUITE MISSED IT: it asserted release-on-RESOLVE and
 * release-on-THROW -- both cases where the promise SETTLES. The leak lives in
 * the third case, "never settles", which no test expressed. These do.
 */
const EventEmitter = require('events')
const renderGate = require('./render-gate')

// A response double that can emit the lifecycle events Express/Node emit.
function mockRes () {
  const res = new EventEmitter()
  res.headers = {}
  res.statusCode = null
  res.setHeader = (k, v) => { res.headers[k] = v }
  res.status = (c) => { res.statusCode = c; return res }
  res.end = () => { res.emit('finish'); res.emit('close'); return res }
  return res
}

function mockReq (headers = {}) {
  const lower = {}
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k]
  }
  return { headers: lower, get: (n) => lower[String(n).toLowerCase()] }
}

describe('render-gate slot lifecycle (leak regression)', () => {
  beforeEach(() => {
    renderGate.resetForTest()
    delete process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT
  })

  test('🔴 a client disconnect releases the slot even if the render never settles', () => {
    const res = mockRes()
    renderGate.acquireForRequest(mockReq(), res)
    expect(renderGate.stats().inFlight).toBe(1)

    // The render promise NEVER settles -- this is the production case. The only
    // signal that the work is over is the socket closing.
    res.emit('close')

    expect(renderGate.stats().inFlight).toBe(0)
  })

  test('🔴 repeated aborts cannot wedge the pod (the observed failure)', () => {
    // Reproduces what happened live: several aborted renders in a row.
    for (let i = 0; i < 10; i++) {
      const res = mockRes()
      renderGate.acquireForRequest(mockReq(), res)
      res.emit('close')
    }
    expect(renderGate.stats().inFlight).toBe(0)
    // ... and the pod must still admit pre-warm work afterwards.
    expect(renderGate.shouldShed(mockReq({ 'RFCx-Prewarm': '1' })).shed).toBe(false)
  })

  test('release happens EXACTLY once when both the finally and close fire', () => {
    const res = mockRes()
    const releaseSlot = renderGate.acquireForRequest(mockReq(), res)
    expect(renderGate.stats().inFlight).toBe(1)

    res.emit('close') // response ended
    releaseSlot() // ... and the caller's finally also runs

    // A double release would drive the counter negative, which silently RAISES
    // the effective limit -- the mirror-image bug.
    expect(renderGate.stats().inFlight).toBe(0)
  })

  test('both finish and close firing still releases exactly once', () => {
    const res = mockRes()
    renderGate.acquireForRequest(mockReq(), res)
    res.emit('finish')
    res.emit('close')
    expect(renderGate.stats().inFlight).toBe(0)
  })

  test('the normal path still releases via the returned handle', () => {
    const res = mockRes()
    const releaseSlot = renderGate.acquireForRequest(mockReq(), res)
    releaseSlot()
    expect(renderGate.stats().inFlight).toBe(0)
  })

  test('concurrent requests are tracked independently', () => {
    const a = mockRes()
    const b = mockRes()
    renderGate.acquireForRequest(mockReq(), a)
    renderGate.acquireForRequest(mockReq(), b)
    expect(renderGate.stats().inFlight).toBe(2)
    a.emit('close')
    expect(renderGate.stats().inFlight).toBe(1)
    b.emit('close')
    expect(renderGate.stats().inFlight).toBe(0)
  })

  test('listeners are removed so an aborted request cannot leak memory', () => {
    const res = mockRes()
    const releaseSlot = renderGate.acquireForRequest(mockReq(), res)
    expect(res.listenerCount('close')).toBe(1)
    releaseSlot()
    // Under sustained load these accumulate on long-lived objects if not cleaned.
    expect(res.listenerCount('close')).toBe(0)
    expect(res.listenerCount('finish')).toBe(0)
  })

  test('works when res has no event interface (defensive)', () => {
    const releaseSlot = renderGate.acquireForRequest(mockReq(), {})
    expect(renderGate.stats().inFlight).toBe(1)
    releaseSlot()
    expect(renderGate.stats().inFlight).toBe(0)
  })
})
