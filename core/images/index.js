const router = require('express').Router()
const { httpErrorHandler } = require('../../common/error-handling/http')
const { ValidationError } = require('../../common/error-handling/errors')
const storageService = require('../_services/storage')
const {
  resizeImageBuffer,
  normaliseDimension,
  isAllowedFormat,
  ALLOWED_FORMATS,
  DEFAULT_FORMAT,
  MAX_DIMENSION,
  DIMENSION_STEP,
  MAX_SOURCE_BYTES
} = require('../_services/images/resize')

// Dynamic image resize endpoint (rfcx-local, 2026-08-17).
//
//   GET /images/:bucket/*?w=&h=&f=
//
// PUBLIC (mounted outside authenticate() in core/app.js -- see the rationale
// there). Serves resized copies of images that are ALREADY anonymously
// readable, to <img> tags that cannot send an Authorization header.
//
// Mirrors the audio/spectrogram flow in segment-file-utils.js:
//   look in cache bucket -> HIT: serve
//                        -> MISS: fetch original -> convert -> serve
//                                 -> fire-and-forget writeback to cache
//
// The whole point is that "has a thumbnail been generated?" stops being a
// question anyone has to answer -- see the coverage measurements in
// core/_services/images/resize.js.

const MEDIA_CACHE_ENABLED = `${process.env.MEDIA_CACHE_ENABLED}` === 'true'

// ---------------------------------------------------------------------------
// SOURCE BUCKETS: a short whitelist, resolved by ALIAS.
//
// Modelled on how the audio side treats its sources: the caller names a
// logical thing, and the app maps that to real storage (see
// storageService.buckets, where `streams` is an alias for whatever
// INGEST_BUCKET points at). The caller never names a raw bucket.
//
// This must stay a whitelist. A caller-supplied bucket name would turn the
// route into a read oracle for every bucket the pod's credentials can reach --
// including the private ingest bucket -- and would let a caller aim the
// provider chain at arbitrary remote endpoints. Adding a source is one line
// here, so the constraint is cheap.
//
// Only PUBLIC, image-bearing buckets belong in this map. `arbimon-profile` is
// the 2026-08-17 split of the old mixed `arbimon` bucket and holds exactly the
// project/user profile images this endpoint exists for; it is already
// anonymous-download and CF-cached, so resizing it exposes nothing new.
const SOURCE_BUCKETS = {
  'arbimon-profile': () => process.env.ARBIMON_PROFILE_BUCKET || 'arbimon-profile',
  arbimon: () => process.env.ARBIMON_BUCKET || 'arbimon'
}

// Cache lifetime advertised to browsers/CF. These URLs are effectively
// content-addressed: the stored keys carry a content hash
// (`project-profile-image-<hash>.png`) and the render params are in the query,
// so a changed image is a changed URL.
//
// NOTE (measured 2026-08-17): MinIO sends NO Cache-Control of its own, and the
// `max-age=14400` observed on s3.arbimon.org objects is CLOUDFLARE's default
// heuristic for static file extensions, not something we control. So we set it
// explicitly here rather than inheriting an edge default that could change.
// `public` is correct (unlike the spectrogram route's `private`): these are
// unauthenticated public profile images, so shared/CDN caching is desirable.
const CACHE_CONTROL = 'public, max-age=604800, s-maxage=604800, immutable'

// Cache key. Quantised dimensions are what make this bounded: `w=141`, `w=142`
// and `w=144` all resolve to the same key, so the key-space per source object
// is (MAX_DIMENSION/DIMENSION_STEP)^2 x formats in the worst case, regardless
// of how many distinct values a caller tries.
function buildCacheKey (bucketAlias, width, height, format, objectKey) {
  return `${bucketAlias}/${width}x${height}/${format}/${objectKey}`
}

async function streamToBuffer (stream, limit) {
  return await new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    stream.on('data', (c) => {
      total += c.length
      if (total > limit) {
        stream.destroy()
        reject(new ValidationError('Source image exceeds the maximum resizable size'))
        return
      }
      chunks.push(c)
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/**
 * @swagger
 *
 * /images/{bucket}/{key}:
 *   get:
 *     summary: Resize an image on demand (resize-on-request, cached)
 *     description: >
 *       Returns the source image scaled to fit within the requested bounding
 *       box, converted to the requested format. Aspect ratio is preserved and
 *       images are only shrunk, never upscaled. Dimensions are free-form but
 *       bounded (max 1024) and snapped to a 32px grid so the cache key-space
 *       stays finite. Results are cached; a cache miss resizes on the fly.
 *     tags:
 *       - images
 *     parameters:
 *       - name: bucket
 *         description: Source bucket alias (e.g. `arbimon-profile`).
 *         in: path
 *         required: true
 *         type: string
 *       - name: key
 *         description: Object key within the source bucket.
 *         in: path
 *         required: true
 *         type: string
 *       - name: w
 *         description: Target width (1-1024, snapped up to a multiple of 32).
 *         in: query
 *         type: integer
 *       - name: h
 *         description: Target height. Defaults to `w` (square bounding box).
 *         in: query
 *         type: integer
 *       - name: f
 *         description: Output format - webp (default), jpg, or png.
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Unsupported dimensions/format/bucket
 *       404:
 *         description: Source image not found
 *       415:
 *         description: Source object is not a decodable image
 */
router.get('/images/:bucket/*', function (req, res) {
  const handler = httpErrorHandler(req, res, 'Failed getting resized image')

  ;(async () => {
    const query = req.query || {}
    const bucketAlias = `${req.params.bucket}`
    const objectKey = req.params[0]
    const format = `${query.f || DEFAULT_FORMAT}`.toLowerCase()

    // Validate BEFORE any storage call, so a probe for an unsupported size
    // costs nothing and cannot mint a cache key.
    const resolveBucket = Object.prototype.hasOwnProperty.call(SOURCE_BUCKETS, bucketAlias)
      ? SOURCE_BUCKETS[bucketAlias]
      : undefined
    if (resolveBucket === undefined) {
      throw new ValidationError(`Unsupported source bucket. Allowed buckets: ${Object.keys(SOURCE_BUCKETS).join(', ')}`)
    }
    if (!isAllowedFormat(format)) {
      throw new ValidationError(`Unsupported format. Allowed formats: ${Object.keys(ALLOWED_FORMATS).join(', ')}`)
    }
    if (!objectKey || objectKey.includes('..')) {
      throw new ValidationError('Invalid object key')
    }

    // `w` is required; `h` defaults to `w`, giving the common square bounding
    // box with one parameter. Both are snapped onto the grid.
    const width = normaliseDimension(query.w)
    if (width === null) {
      throw new ValidationError(`"w" (width) is required and must be between 1 and ${MAX_DIMENSION} (snapped to a multiple of ${DIMENSION_STEP})`)
    }
    const height = query.h === undefined ? width : normaliseDimension(query.h)
    if (height === null) {
      throw new ValidationError(`"h" (height) must be between 1 and ${MAX_DIMENSION} (snapped to a multiple of ${DIMENSION_STEP})`)
    }

    const sourceBucket = resolveBucket()
    const spec = ALLOWED_FORMATS[format]
    const cacheBucket = storageService.buckets.mediaCacheImage
    const cacheKey = buildCacheKey(bucketAlias, width, height, format, objectKey)

    // NO force-refresh on this route. The audio/spec route accepts
    // `?refresh=true`, but it is AUTHENTICATED and the edge strips the arg on
    // the arbimon.org + demo blocks.
    //
    // THIS route is public, and the edge is NOT a sufficient guard for it: the
    // `explorer.rfcx.org` server block forwards `$args` VERBATIM (it has no
    // refresh-stripping `if` chain, unlike the other two blocks), so an
    // unauthenticated `?refresh=true` would reach the app there and force
    // unbounded re-renders -- a CPU/DoS amplifier, exactly what media-api's own
    // source warns about ("media-api should ALSO refuse refresh ... do not rely
    // on this block alone"). Cache-bypass is simply not offered here.
    //
    // Operational note: because these keys are content-addressed on the render
    // params, the way to invalidate is to delete the cached object, not to ask
    // the endpoint to re-render.
    // Single round-trip cache read: one GET that yields a stream on hit or null
    // on miss (no HEAD-then-GET pair), matching the established pattern.
    const cacheStream = MEDIA_CACHE_ENABLED
      ? await storageService.getObjectStreamOrNull(cacheBucket, cacheKey)
      : null

    if (cacheStream) {
      res.setHeader('Content-Type', spec.contentType)
      res.setHeader('Cache-Control', CACHE_CONTROL)
      res.setHeader('X-Rfcx-Image-Cache', 'HIT')
      // If the cache read errors mid-stream after headers are sent we cannot
      // recover the response; log and let the socket close.
      cacheStream.on('error', (err) => { console.error('image-cache read error', err && err.message) })
      return cacheStream.pipe(res)
    }

    // MISS: fetch the original. A miss here is the NORMAL path for the 11.3% of
    // images that never had a pre-baked thumbnail at all.
    const sourceStream = await storageService.getObjectStreamOrNull(sourceBucket, objectKey)
    if (sourceStream === null) {
      // Genuinely absent (or unreadable) source. 404 rather than 500: this is a
      // statement about the object, not about the service.
      res.status(404)
      return res.json({ message: 'Image not found', error: { status: 404 } })
    }

    const sourceBuffer = await streamToBuffer(sourceStream, MAX_SOURCE_BYTES)

    // Content is sniffed by ImageMagick from the magic bytes -- NEVER from the
    // key's extension, which is provably unreliable in this bucket (`.jpg`
    // objects that are PNG; `.enc` / `.jfif` objects that are JPEG).
    const output = await resizeImageBuffer(sourceBuffer, { width, height, format })

    res.setHeader('Content-Type', spec.contentType)
    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.setHeader('Content-Length', output.length)
    res.setHeader('X-Rfcx-Image-Cache', 'MISS')
    res.send(output)

    // Fire-and-forget writeback AFTER the response is sent. The user's request
    // must not wait on the cache PUT -- it only adds latency and holds the
    // request open. A failed writeback simply means the next request re-renders
    // (~20ms), so it is logged and swallowed.
    //
    // Unlike the audio/spec path there is no clone-before-serve concern here:
    // we hold the bytes in memory and never wrote a file that a serve path
    // could unlink out from under us.
    if (MEDIA_CACHE_ENABLED) {
      storageService.uploadBuffer(cacheBucket, cacheKey, output)
        .catch((err) => { console.error('image-cache writeback failed', cacheKey, err && err.message) })
    }
  })().catch(handler)
})

module.exports = router
