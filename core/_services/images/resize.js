const { spawn } = require('child_process')

// Dynamic image resize for media-api (rfcx-local, 2026-08-17).
//
// WHY THIS EXISTS. Profile images (project + user avatars) were served
// full-size and CSS-shrunk to <=150px by the web app. Measured on the live
// `arbimon-profile` bucket: originals average 426 KiB, the 144x144 sidecars
// average 34 KiB -- a 92.0% reduction over 410 paired objects. Worse, the
// pre-baked `.thumbnail.` sidecar does not always EXIST: 52 of 462 fulls
// (11.3%) have none, and a missing sidecar HARD-404s (verified live:
// projects/10/...-3329ef68.png -> 200, its .thumbnail.png -> 404 = a broken
// avatar). Resizing on demand makes sidecar coverage irrelevant.
//
// WHY IMAGEMAGICK AND NOT `sharp`. ImageMagick is ALREADY in this image
// (/usr/bin/convert, 6.9.11-60 Q16) and already shelled out to by the
// spectrogram pipeline. `sharp` is a native module with platform/libc-specific
// binaries -- a new build-time hazard for zero functional gain here.
//
// WHY IN-MEMORY (no temp files). media-api's CACHE_DIRECTORY is `/tmp/`, which
// is the container OVERLAYFS, not an emptyDir -- every temp write is a
// copy-up into the container layer and it is the documented DiskPressure
// eviction path (media-api pods have already been Evicted under it). Sources
// here are small (largest object in the live bucket is 2.9 MiB), so we pipe
// bytes through stdin/stdout and never touch the filesystem. VERIFIED in-pod:
// a 10 MB source resized with ZERO scratch files and no overlayfs growth.
//
// WHY WE SNIFF CONTENT INSTEAD OF TRUSTING THE EXTENSION. Measured on real
// objects, the stored extension is frequently WRONG: `.jpg` objects that are
// actually PNG, a `.webp` that is PNG, and `.enc` / `.jfif` objects that are
// JPEG. ImageMagick reading from stdin dispatches on the magic bytes, which is
// exactly the behaviour we want. Never derive the decoder from the key.

const CONVERT_PATH = process.env.IMAGEMAGICK_PATH || '/usr/bin/convert'

// ---------------------------------------------------------------------------
// DIMENSIONS: BOUNDED AND FREE-FORM, *NOT* A DISCRETE WHITELIST.
//
// This deliberately mirrors how the spectrogram route already treats `d<x>.<y>`
// in core/stream-segments/bl/segment-file-parsing.js: it accepts arbitrary
// dimensions and enforces a CEILING (`dimensions.y > 1024` -> ValidationError)
// rather than a fixed menu. Callers there ask for whatever the UI needs.
// Forcing a 3-value menu here would have been a different contract from the
// rest of this API for no measured benefit.
//
// The cache-cardinality concern is real but is addressed by BOUNDING and
// QUANTISING rather than by enumerating:
//   * MAX_DIMENSION caps the work per request.
//   * DIMENSION_STEP snaps requests to a grid, so `w=141`, `w=142`, `w=144`
//     all collapse onto ONE cache key. An attacker walking w=1..N therefore
//     mints at most MAX_DIMENSION/DIMENSION_STEP keys per source object
//     (currently 64), not N of them -- and every one of those keys is a
//     legitimate size someone could have asked for anyway.
// That keeps the endpoint dynamic (your ask) while keeping the key-space
// finite (the DoS/cache concern). Quantising is also why we can afford to be
// generous with the ceiling.
//
// STEP=16 IS LOAD-BEARING, not a round number: the existing thumbnail config
// (PROJECT_IMAGE_CONFIG.thumbnail in rfcx/arbimon) is 144x144, and 144 is NOT
// a multiple of 32. A 32px grid would have silently rounded today's canonical
// size up to 160 and made this endpoint unable to reproduce the sidecars it is
// replacing. 16 divides 144 exactly (9x16) and still bounds the key-space at
// 64 values per axis. If you ever change this step, re-check it against the
// sizes the app actually requests.
const MAX_DIMENSION = 1024
const MIN_DIMENSION = 16
const DIMENSION_STEP = 16

// Whitelisted output formats. All three are `rw+` in this build's delegate list
// (verified in-pod: libwebp 1.2.4, libjpeg-turbo 2.1.5, libpng 1.6.39).
//
// WEBP IS THE DEFAULT, and the reason is measured, not fashionable: at visually
// equivalent quality on the live profile images, webp came out 9-33% smaller
// than jpeg (mean ~21%) and roughly an ORDER OF MAGNITUDE smaller than png
// (~2-4 KiB vs ~23-29 KiB), because png is lossless and these are photographs.
// webp also keeps an alpha channel, which jpeg cannot, so it is the one format
// that serves both photographic avatars and transparent logos well. Browser
// support is universal on anything current. jpeg stays available as the
// compatibility fallback; png stays for callers that specifically want
// lossless.
//
// Format is an EXPLICIT part of the request, not `Accept` negotiation: content
// negotiation multiplies cache keys for the same bytes and forces a `Vary`
// header, which defeats shared/CDN caching -- the opposite of the goal.
const ALLOWED_FORMATS = {
  webp: { magick: 'webp', contentType: 'image/webp', quality: 80 },
  jpg: { magick: 'jpg', contentType: 'image/jpeg', quality: 82 },
  png: { magick: 'png', contentType: 'image/png', quality: 90 }
}
const DEFAULT_FORMAT = 'webp'

// Hard ceilings passed to ImageMagick itself, so a decode bomb is refused by
// the decoder rather than by our own accounting after the damage is done.
//   disk 0    -- REFUSE to spill to disk. Without this IM silently falls back
//                to a disk-backed pixel cache under /tmp = the overlayfs
//                copy-up we are specifically avoiding. An image that will not
//                fit in the memory limit errors out instead.
//   area/mem  -- bound decoded pixel area (a 10 MB PNG can decode to GBs).
//   time      -- wall-clock ceiling inside IM.
//   thread 1  -- these are small images and the pod has cpu=2 shared with the
//                sox/ffmpeg spectrogram path; parallel decode buys nothing and
//                would let one request monopolise the quota.
const MAGICK_LIMITS = [
  '-limit', 'memory', '64MiB',
  '-limit', 'map', '64MiB',
  '-limit', 'disk', '0',
  '-limit', 'area', '48MB',
  '-limit', 'time', '10',
  '-limit', 'thread', '1'
]

// Belt-and-braces wall clock around the child process itself, in case IM's own
// `-limit time` is not honoured for a given codec path.
const CONVERT_TIMEOUT_MS = 12000

// Refuse absurd inputs before we even spawn. The largest real object in the
// live bucket is 2.9 MiB; 24 MiB leaves generous headroom while capping the
// bytes we are willing to buffer per request.
const MAX_SOURCE_BYTES = 24 * 1024 * 1024

class ImageResizeError extends Error {
  constructor (message, status = 500) {
    super(message)
    this.name = 'ImageResizeError'
    this.status = status
  }
}

/**
 * Normalise a requested dimension onto the allowed grid.
 *
 * Returns the quantised value, or null if the input is not a usable number.
 * Snapping UP (ceil) means a request for 150 (the web app's actual ask) yields
 * 160 rather than 128 -- never smaller than asked, so the browser is always
 * downscaling, never upscaling a too-small image.
 *
 * @param {*} value raw requested dimension
 * @returns {number|null}
 */
function normaliseDimension (value) {
  if (value === undefined || value === null || value === '') { return null }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) { return null }
  if (n > MAX_DIMENSION) { return null }
  const snapped = Math.ceil(n / DIMENSION_STEP) * DIMENSION_STEP
  return Math.min(Math.max(snapped, MIN_DIMENSION), MAX_DIMENSION)
}

function isAllowedFormat (format) {
  return Object.prototype.hasOwnProperty.call(ALLOWED_FORMATS, format)
}

/**
 * Resize an image buffer to fit within width x height, converting to `format`.
 *
 * Aspect ratio is preserved and the image is only ever SHRUNK (the `>` flag),
 * so requesting 600 for a 320px-wide avatar returns the 320px original rather
 * than an upscaled blur.
 *
 * @param {Buffer} sourceBuffer raw bytes of the source image
 * @param {object} opts
 * @param {number} opts.width  quantised target width
 * @param {number} opts.height quantised target height
 * @param {string} opts.format one of ALLOWED_FORMATS
 * @returns {Promise<Buffer>} encoded output bytes
 */
async function resizeImageBuffer (sourceBuffer, opts = {}) {
  const { width, height, format = DEFAULT_FORMAT } = opts

  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length === 0) {
    throw new ImageResizeError('Empty source image', 502)
  }
  if (sourceBuffer.length > MAX_SOURCE_BYTES) {
    throw new ImageResizeError('Source image too large to resize', 413)
  }
  if (!isAllowedFormat(format)) {
    throw new ImageResizeError(`Unsupported format (allowed: ${Object.keys(ALLOWED_FORMATS).join(', ')})`, 400)
  }
  // Dimensions must already be normalised by the caller. Re-validate rather
  // than trust, so this function is safe to call from anywhere.
  for (const [name, v] of [['width', width], ['height', height]]) {
    if (!Number.isInteger(v) || v < MIN_DIMENSION || v > MAX_DIMENSION || v % DIMENSION_STEP !== 0) {
      throw new ImageResizeError(`Invalid ${name}: must be a multiple of ${DIMENSION_STEP} between ${MIN_DIMENSION} and ${MAX_DIMENSION}`, 400)
    }
  }

  const spec = ALLOWED_FORMATS[format]
  const geometry = `${width}x${height}>`

  const args = [
    ...MAGICK_LIMITS,
    // JPEG SHRINK-ON-LOAD. libjpeg can DCT-scale during decode, so for a JPEG
    // source we ask the decoder for the smallest scale >= our target instead
    // of decoding full resolution and throwing pixels away. Measured on a
    // 3000x2000 JPEG: 85ms -> 24ms (3.5x) for a byte-equivalent result
    // (4179 vs 4166 bytes). Ignored for non-JPEG sources, so it is safe to
    // pass unconditionally -- and it must come BEFORE the input.
    '-define', `jpeg:size=${width * 2}x${height * 2}`,
    // Read from stdin. `[0]` takes ONLY the first frame -- without it a
    // multi-frame GIF/ICO/TIFF would be decoded in full and then written as a
    // multi-image stream, which is both a resource amplifier and a wrong
    // answer for an avatar. Measured: a 60-frame source took 161ms vs 6ms.
    '-[0]',
    // Honour EXIF orientation, then drop ALL metadata. `-strip` removes EXIF
    // (including GPS coordinates that users may not realise are embedded in an
    // uploaded photo) and shrinks the output. Order matters: auto-orient must
    // run before the orientation tag is stripped.
    //
    // REDUNDANT-BY-MEASUREMENT, KEPT DELIBERATELY: `-thumbnail` below already
    // implies a strip, and mutation testing confirmed removing `-strip` alone
    // changes nothing observable (verified in-pod: comment survives `-resize`
    // without strip, but NOT `-thumbnail` without strip). It stays because the
    // privacy property must not silently depend on an incidental side effect of
    // whichever resize operator we happen to use -- swap `-thumbnail` back to
    // `-resize` for any reason and the EXIF/GPS leak returns instantly.
    '-auto-orient',
    '-strip',
    // Flatten onto white when the target cannot carry alpha, otherwise a
    // transparent PNG becomes a black box in JPEG.
    ...(format === 'jpg' ? ['-background', 'white', '-alpha', 'remove', '-alpha', 'off'] : []),
    // `-thumbnail` = resize + strip, and it downsamples more aggressively
    // before filtering. Measured 246ms -> 201ms on a 3000x2000 PNG (where
    // shrink-on-load cannot help, since PNG has no DCT scaling).
    '-thumbnail', geometry,
    '-quality', String(spec.quality),
    `${spec.magick}:-`
  ]

  return await new Promise((resolve, reject) => {
    let child
    try {
      // NOTE: spawn WITHOUT a shell. The rest of this codebase uses
      // `runExec` (child_process.exec), which interpolates into `sh -c`.
      // Here the arguments derive from a user-controlled URL, so a shell
      // would be a command-injection surface. Everything is validated
      // upstream too, but defence in depth: no shell, ever.
      child = spawn(CONVERT_PATH, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, MAGICK_THREAD_LIMIT: '1' }
      })
    } catch (err) {
      reject(new ImageResizeError(`Failed to start image converter: ${err.message}`))
      return
    }

    const outChunks = []
    const errChunks = []
    let outBytes = 0
    let settled = false
    const finish = (err, value) => {
      if (settled) { return }
      settled = true
      clearTimeout(timer)
      if (err) { reject(err) } else { resolve(value) }
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new ImageResizeError('Image resize timed out', 504))
    }, CONVERT_TIMEOUT_MS)

    child.stdout.on('data', (c) => {
      outBytes += c.length
      // The output of a bounded resize cannot legitimately approach this. If
      // it does, something pathological is happening -- stop buffering.
      if (outBytes > MAX_SOURCE_BYTES) {
        child.kill('SIGKILL')
        finish(new ImageResizeError('Resized output unexpectedly large', 500))
        return
      }
      outChunks.push(c)
    })
    child.stderr.on('data', (c) => { if (errChunks.length < 32) { errChunks.push(c) } })

    child.on('error', (err) => finish(new ImageResizeError(`Image converter failed: ${err.message}`)))

    child.on('close', (code) => {
      if (code !== 0) {
        const detail = Buffer.concat(errChunks).toString().split('\n')[0]
        // A non-zero exit here is overwhelmingly "this is not a decodable
        // image" (or it exceeded a limit), i.e. a property of the stored
        // object, not a server fault. 415 keeps it out of the 5xx budget.
        finish(new ImageResizeError(`Unable to decode or resize image${detail ? `: ${detail}` : ''}`, 415))
        return
      }
      const out = Buffer.concat(outChunks)
      if (out.length === 0) {
        finish(new ImageResizeError('Image converter produced no output', 500))
        return
      }
      finish(null, out)
    })

    child.stdin.on('error', () => { /* killed child; handled by close/error */ })
    child.stdin.end(sourceBuffer)
  })
}

module.exports = {
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
}