/**
 * WIRING assertions for pre-warm shedding (rfcx-local, 2026-08-23).
 *
 * render-gate.unit.test.js proves the gate's own logic. These prove it is
 * CONNECTED CORRECTLY inside getFile() -- which is a separate question, and the
 * one that carries the acceptance criteria that matter operationally:
 *
 *   * a cache HIT is NEVER shed, even when the pod is saturated
 *     (shedding the cheap path would make the pre-warm plane fight itself);
 *   * a cache MISS from pre-warm traffic IS shed with 429 when saturated;
 *   * a cache MISS from USER traffic renders regardless of load;
 *   * the in-flight slot is RELEASED when a render throws, not just on success
 *     (a leak here silently sheds all pre-warm traffic forever).
 */
process.env.MEDIA_CACHE_ENABLED = 'true'
process.env.CACHE_DIRECTORY = '/tmp/'
process.env.FFMPEG_PATH = '/usr/local/bin/ffmpeg'
process.env.SOX_PATH = '/usr/local/bin/sox'

jest.mock('./shell')
jest.mock('../../_services/storage', () => ({
  buckets: { mediaCacheSpec: 'spec-bucket', mediaCacheAudio: 'audio-bucket' },
  getObjectStreamOrNull: jest.fn(),
  exists: jest.fn()
}))
// The render pipeline itself is out of scope here: we assert whether it is
// REACHED, not what it produces. downloadSegments() is the first thing
// generateFile() awaits, so failing it there is a clean, observable proxy for
// "a render was attempted".
jest.mock('../../../noncore/_utils/internal-rfcx/asset-utils', () => ({
  assetUtils: {
    getGuardianAudioAssetFilePath: jest.fn(),
    deleteLocalFileFromFileSystem: jest.fn(),
    mimeTypeFromAudioCodec: () => 'audio/mpeg'
  }
}))

const storageService = require('../../_services/storage')
const renderGate = require('./render-gate')
const segmentFileUtils = require('./segment-file-utils')

function mockRes () {
  return {
    headers: {},
    statusCode: null,
    ended: false,
    piped: false,
    setHeader (k, v) { this.headers[k] = v },
    status (code) { this.statusCode = code; return this },
    end () { this.ended = true; return this },
    attachment () {}
  }
}

function mockReq (headers = {}) {
  const lower = {}
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k]
  }
  return {
    headers: lower,
    query: {},
    rfcx: { content_type: 'png' },
    get (name) { return lower[String(name).toLowerCase()] }
  }
}

// Must satisfy combineStandardFilename() -- an incomplete fixture throws while
// building the cache key, BEFORE the gate is reached, which would make these
// tests pass/fail for reasons unrelated to shedding.
const ATTRS = {
  streamId: 'abc123',
  fileType: 'spec',
  time: { starts: '20210101T000000000Z', ends: '20210101T000010000Z' },
  dimensions: { x: 100, y: 100 },
  clip: 'full',
  gain: 1,
  windowFunc: 'hann',
  zAxis: 100,
  monochrome: 'false',
  jpegCompression: 0,
  fileExtension: 'png'
}

const SEGMENTS = [{ start: 0, end: 10000, sourceFilePath: '/tmp/s.opus' }]

describe('getFile pre-warm shedding wiring', () => {
  beforeEach(() => {
    renderGate.resetForTest()
    delete process.env.MEDIA_RENDER_SHED_MAX_INFLIGHT
    storageService.getObjectStreamOrNull.mockReset()
    storageService.exists.mockReset()
  })

  test('🔴 a cache HIT is never shed, even when saturated', async () => {
    // Saturate well past the limit.
    for (let i = 0; i < 10; i++) {
      renderGate.acquire()
    }
    let pipedTo = null
    storageService.getObjectStreamOrNull.mockResolvedValue({
      on () { return this },
      pipe (dest) { pipedTo = dest; return dest }
    })
    const res = mockRes()
    await segmentFileUtils.getFile(mockReq({ 'RFCx-Prewarm': '1' }), res, { ...ATTRS }, 'png', SEGMENTS)

    expect(res.statusCode).not.toBe(429)
    expect(pipedTo).toBe(res)
  })

  test('a cache MISS from pre-warm traffic is shed with 429 when saturated', async () => {
    for (let i = 0; i < 10; i++) {
      renderGate.acquire()
    }
    storageService.getObjectStreamOrNull.mockResolvedValue(null)
    const res = mockRes()
    await segmentFileUtils.getFile(mockReq({ 'RFCx-Prewarm': '1' }), res, { ...ATTRS }, 'png', SEGMENTS)

    expect(res.statusCode).toBe(429)
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  test('🔴 a cache MISS from USER traffic is NOT shed when saturated', async () => {
    for (let i = 0; i < 10; i++) {
      renderGate.acquire()
    }
    storageService.getObjectStreamOrNull.mockResolvedValue(null)
    const res = mockRes()
    // No pre-warm marker => must proceed into the render pipeline. The pipeline
    // is not mocked to succeed, so it throws -- which is itself the proof that
    // the gate ADMITTED the request rather than shedding it.
    await expect(
      segmentFileUtils.getFile(mockReq({}), res, { ...ATTRS }, 'png', SEGMENTS)
    ).rejects.toBeDefined()

    expect(res.statusCode).not.toBe(429)
  })

  test('🔴 the in-flight slot is released when a render THROWS', async () => {
    storageService.getObjectStreamOrNull.mockResolvedValue(null)
    const before = renderGate.stats().inFlight
    await expect(
      segmentFileUtils.getFile(mockReq({}), mockRes(), { ...ATTRS }, 'png', SEGMENTS)
    ).rejects.toBeDefined()
    // A leak here would permanently consume capacity and eventually shed all
    // pre-warm traffic on this pod, with no way to recover short of a restart.
    expect(renderGate.stats().inFlight).toBe(before)
  })
})
