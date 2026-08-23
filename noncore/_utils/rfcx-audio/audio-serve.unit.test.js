/**
 * Unit assertions for serveAudioFromFile() (rfcx-local, 2026-08-23).
 *
 * This helper had ZERO test coverage, which is how it shipped a promise that
 * never settles on two of its four terminal paths -- the root cause of the
 * render-slot leak fixed at the gate in rfcx-api #673, and of a measured
 * temp-file leak (44 orphaned files on one pod after an aborted burst).
 *
 * The contract these encode:
 *   * settle EXACTLY ONCE on every terminal path;
 *   * ALWAYS unlink the served file (previously only on success);
 *   * a client ABORT resolves (not a server error); a stream ERROR rejects;
 *   * fs.stat failure rejects WITH A MESSAGE (it used to be `new Error()`).
 */
const EventEmitter = require('events')
const fs = require('fs')

jest.mock('fs')

const { audioUtils } = require('./audio-serve')

// A response double: an EventEmitter that also records what was written.
function mockRes () {
  const res = new EventEmitter()
  res.written = null
  res.ended = false
  res.writeHead = (code, headers) => { res.written = { code, headers } }
  res.end = () => { res.ended = true }
  return res
}

// A read stream double we can drive through end / error / destroy.
function mockStream () {
  const s = new EventEmitter()
  s.destroyed = false
  s.destroy = () => { s.destroyed = true }
  s.pipe = () => s
  return s
}

describe('serveAudioFromFile', () => {
  let stream
  let unlinked

  beforeEach(() => {
    jest.clearAllMocks()
    unlinked = []
    stream = mockStream()
    fs.stat.mockImplementation((p, cb) => cb(null, { size: 1234 }))
    fs.createReadStream.mockImplementation(() => stream)
    fs.unlink.mockImplementation((p, cb) => { unlinked.push(p); if (cb) { cb(null) } })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('normal stream: resolves once and unlinks the file', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/a.png', 'a.png', 'image/png')
    stream.emit('end')
    await expect(p).resolves.toBeNull()
    expect(res.ended).toBe(true)
    expect(unlinked).toEqual(['/tmp/a.png'])
  })

  test('🔴 client abort (res close) settles the promise instead of hanging forever', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/b.png', 'b.png', 'image/png')
    // The stream never emits 'end' -- this is the production leak case.
    res.emit('close')
    await expect(p).resolves.toBeNull()
  })

  test('🔴 client abort still UNLINKS the temp file', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/c.png', 'c.png', 'image/png')
    res.emit('close')
    await p
    // 44 orphans on one pod were measured before this behaviour existed.
    expect(unlinked).toEqual(['/tmp/c.png'])
  })

  test('🔴 client abort destroys the read stream so the fd is released', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/d.png', 'd.png', 'image/png')
    res.emit('close')
    await p
    expect(stream.destroyed).toBe(true)
  })

  test('🔴 close AND end both firing settles exactly once, unlinking once', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/e.png', 'e.png', 'image/png')
    // A NORMAL response on Node v20.9.0 emits BOTH finish and close, so this is
    // the common case, not an edge case.
    stream.emit('end')
    res.emit('close')
    await expect(p).resolves.toBeNull()
    expect(unlinked).toEqual(['/tmp/e.png'])
  })

  test('stream error rejects (a read failure IS a server error) and unlinks', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/f.png', 'f.png', 'image/png')
    stream.emit('error', new Error('EIO'))
    await expect(p).rejects.toThrow('EIO')
    expect(unlinked).toEqual(['/tmp/f.png'])
  })

  test('a stream error after an abort does not re-settle', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/g.png', 'g.png', 'image/png')
    res.emit('close')
    stream.emit('error', new Error('late'))
    // Abort won the race: the promise must stay RESOLVED, not become rejected.
    await expect(p).resolves.toBeNull()
    expect(unlinked).toEqual(['/tmp/g.png'])
  })

  test('missing file rejects WITH A MESSAGE and does not unlink', async () => {
    fs.stat.mockImplementation((p, cb) => cb(new Error('ENOENT')))
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/missing.png', 'm.png', 'image/png')
    // It used to reject with `new Error()` -- no message -- which the three
    // .catch(console.error) callers logged as a bare "Error".
    await expect(p).rejects.toThrow(/Audio file not found/)
    expect(unlinked).toEqual([])
  })

  test('removes its res listener so aborted requests cannot accumulate them', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(res, '/tmp/h.png', 'h.png', 'image/png')
    expect(res.listenerCount('close')).toBe(1)
    stream.emit('end')
    await p
    expect(res.listenerCount('close')).toBe(0)
  })

  test('inline drops Content-Disposition; additionalHeaders are merged', async () => {
    const res = mockRes()
    const p = audioUtils.serveAudioFromFile(
      res, '/tmp/i.png', 'i.png', 'image/png', true, { 'RFCx-Stream-Gaps': '[]' })
    stream.emit('end')
    await p
    expect(res.written.code).toBe(200)
    expect(res.written.headers['Content-Disposition']).toBeUndefined()
    expect(res.written.headers['RFCx-Stream-Gaps']).toBe('[]')
    expect(res.written.headers['Content-Length']).toBe(1234)
  })
})
