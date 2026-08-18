const fs = require('fs')

const {
  resizeImageBuffer,
  normaliseDimension,
  isAllowedFormat,
  ALLOWED_FORMATS,
  DEFAULT_FORMAT,
  MAX_DIMENSION,
  MIN_DIMENSION,
  DIMENSION_STEP,
  MAX_SOURCE_BYTES,
  ImageResizeError
} = require('./resize')

// NOTE ON SCOPE. These are the CI-safe tests: pure logic plus the validation
// paths that reject before any child process is spawned. The behaviour that
// actually depends on the ImageMagick BUILD (stdin/frame syntax, webp/heic
// delegates, alpha flattening, shrink-on-load) is verified by
// qa/image-resize/verify-resize.js + verify-route.js, which run INSIDE a
// media-api pod against the real 6.9.11 binary. CI may not have ImageMagick at
// all, and a laptop's IM7 differs from the deployed IM6 in exactly the ways
// that matter -- so proving it here would prove the wrong thing.
const CONVERT = process.env.IMAGEMAGICK_PATH || '/usr/bin/convert'
const HAS_CONVERT = fs.existsSync(CONVERT)

describe('normaliseDimension (bounded + quantised, NOT a whitelist)', () => {
  // The contract deliberately mirrors the spectrogram route, which accepts an
  // arbitrary d<x>.<y> under a ceiling rather than a fixed menu of sizes.
  test('snaps UP onto the grid so the browser never upscales', () => {
    expect(normaliseDimension(150)).toBe(160)
    expect(normaliseDimension(129)).toBe(144)
    expect(normaliseDimension('300')).toBe(304)
  })

  test('144 (the existing thumbnail size) is exactly representable', () => {
    // PROJECT_IMAGE_CONFIG.thumbnail is 144x144 and 144 is NOT a multiple of
    // 32. A 32px grid would round it to 160 and leave this endpoint unable to
    // reproduce the sidecars it replaces. This test is the guard on that.
    expect(normaliseDimension(144)).toBe(144)
    expect(144 % DIMENSION_STEP).toBe(0)
  })

  test('neighbouring requests collapse onto one cache key', () => {
    const keys = new Set([129, 133, 140, 144].map(normaliseDimension))
    expect(keys.size).toBe(1)
    expect([...keys][0]).toBe(144)
  })

  test('bounds the cache key-space rather than enumerating sizes', () => {
    // This is the whole justification for allowing free-form dimensions: an
    // attacker walking every value mints a bounded number of keys.
    const distinct = new Set()
    for (let i = 1; i <= MAX_DIMENSION; i++) { distinct.add(normaliseDimension(i)) }
    expect(distinct.size).toBe(MAX_DIMENSION / DIMENSION_STEP)
  })

  test('floors tiny requests at MIN_DIMENSION', () => {
    expect(normaliseDimension(1)).toBe(MIN_DIMENSION)
  })

  test('rejects out-of-range and non-numeric input', () => {
    expect(normaliseDimension(MAX_DIMENSION + 1)).toBeNull()
    for (const v of [0, -5, NaN, Infinity, 'abc', '', null, undefined, {}, []]) {
      expect(normaliseDimension(v)).toBeNull()
    }
  })
})

describe('format whitelist', () => {
  test('webp is the default (smaller than jpeg, keeps alpha)', () => {
    expect(DEFAULT_FORMAT).toBe('webp')
    expect(Object.keys(ALLOWED_FORMATS)).toEqual(['webp', 'jpg', 'png'])
  })

  test('rejects formats outside the whitelist', () => {
    for (const f of ['gif', 'tiff', 'svg', 'pdf', 'bmp', '']) {
      expect(isAllowedFormat(f)).toBe(false)
    }
  })

  test('rejects inherited Object.prototype keys', () => {
    // A plain `format in ALLOWED_FORMATS` would let 'constructor'/'toString'
    // through and then blow up downstream.
    for (const f of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(isAllowedFormat(f)).toBe(false)
    }
  })

  test('each format declares a content type', () => {
    for (const spec of Object.values(ALLOWED_FORMATS)) {
      expect(spec.contentType).toMatch(/^image\//)
    }
  })
})

describe('resizeImageBuffer validation (rejects before spawning)', () => {
  const dummy = Buffer.from('not-an-image')
  const sq = (n, format = 'webp') => ({ width: n, height: n, format })

  test('rejects an empty or non-buffer source', async () => {
    await expect(resizeImageBuffer(Buffer.alloc(0), sq(144))).rejects.toMatchObject({ status: 502 })
    await expect(resizeImageBuffer(null, sq(144))).rejects.toMatchObject({ status: 502 })
    await expect(resizeImageBuffer('a string', sq(144))).rejects.toMatchObject({ status: 502 })
  })

  test('rejects an oversized source', async () => {
    const big = Buffer.alloc(MAX_SOURCE_BYTES + 1)
    await expect(resizeImageBuffer(big, sq(144))).rejects.toMatchObject({ status: 413 })
  })

  test('rejects a format outside the whitelist', async () => {
    await expect(resizeImageBuffer(dummy, sq(144, 'gif'))).rejects.toMatchObject({ status: 400 })
    await expect(resizeImageBuffer(dummy, sq(144, 'jpg; touch /tmp/pwned'))).rejects.toMatchObject({ status: 400 })
    expect(fs.existsSync('/tmp/pwned')).toBe(false)
  })

  test('re-validates dimensions rather than trusting the caller', async () => {
    // The route normalises, but this module must be safe called from anywhere.
    for (const dims of [
      { width: 150, height: 150 }, // off-grid
      { width: 2048, height: 144 }, // over ceiling
      { width: 144.5, height: 144 }, // non-integer
      { width: 0, height: 144 }, // below minimum
      { width: '144', height: 144 } // string, not integer
    ]) {
      await expect(resizeImageBuffer(dummy, { ...dims, format: 'webp' }))
        .rejects.toMatchObject({ status: 400 })
    }
  })

  test('errors are ImageResizeError with an HTTP-shaped status', async () => {
    await expect(resizeImageBuffer(Buffer.alloc(0), sq(144))).rejects.toBeInstanceOf(ImageResizeError)
  })
})

// Only meaningful where the binary exists; the authoritative check runs in-pod.
const describeIfConvert = HAS_CONVERT ? describe : describe.skip
describeIfConvert('resizeImageBuffer with a real ImageMagick', () => {
  test('an undecodable payload is 415 (data fault), not 5xx', async () => {
    const junk = Buffer.from('this is definitely not an image, it is just text')
    await expect(resizeImageBuffer(junk, { width: 144, height: 144, format: 'jpg' }))
      .rejects.toMatchObject({ status: 415 })
  })
})
