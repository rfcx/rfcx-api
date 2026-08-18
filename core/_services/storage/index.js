const service = process.env.PLATFORM === 'google' ? require('./google') : require('./amazon')

// Media-api result caches (rfcx-local, 2026-08-10).
//
// These were ONE bucket (`streamsCache`), which forced a single storage policy
// onto artefacts with very different value:
//
//   * SPEC (spectrogram PNG)  -- the user-facing image the Arbimon UI renders
//                                for every pattern-matching detection. Cheap
//                                (~54 KiB) and expensive to regenerate, so it
//                                is worth keeping DURABLY (hot + conveyed to
//                                the NAS) and worth checking the durable tier
//                                before re-rendering.
//   * AUDIO (wav/mp3/...)     -- includes the INTERIM wav that a spectrogram
//                                render produces on its way to the PNG. ~549
//                                KiB each, i.e. ~90% of the old bucket's bytes
//                                while buying no durable value. Stays hot-only
//                                and short-lived; a miss just re-renders.
//   * HEATMAP (index PNGs)    -- derived from MUTABLE index values and
//                                explicitly invalidated by
//                                indexValuesService.clearHeatmapCache() when
//                                new values arrive. MUST NOT become durable:
//                                a NAS copy would survive that invalidation
//                                and serve stale heatmaps.
//
// Splitting them into separate buckets lets the storage layer apply the right
// policy to each (see rfcx-local platform/routing/s3/02-s3-reader-config.yaml
// `isDurable`, which also controls whether durable tiers are consulted on a
// read -- we do NOT want a durable lookup for buckets that have no durable
// copy).
//
// BACK-COMPAT: each new var falls back to STREAMS_CACHE_BUCKET, so an
// environment that has not been split yet keeps today's single-bucket
// behaviour exactly.
const legacyCacheBucket = process.env.STREAMS_CACHE_BUCKET || 'rfcx-streams-cache-testing'
const buckets = {
  streams: process.env.INGEST_BUCKET || 'rfcx-streams-testing',
  // Retained so existing callers/tests that reference `streamsCache` keep
  // working; new code should use one of the three specific caches below.
  streamsCache: legacyCacheBucket,
  mediaCacheSpec: process.env.MEDIA_CACHE_SPEC_BUCKET || legacyCacheBucket,
  mediaCacheAudio: process.env.MEDIA_CACHE_AUDIO_BUCKET || legacyCacheBucket,
  mediaCacheHeatmap: process.env.MEDIA_CACHE_HEATMAP_BUCKET || legacyCacheBucket,
  // Resize-on-demand image cache (rfcx-local, 2026-08-17). Same policy class
  // as mediaCacheSpec -- DURABLE. These are cheap to regenerate individually
  // (~20ms) but they back user-facing avatars across the whole app, so the
  // durable tier is worth consulting on a miss rather than re-rendering the
  // long tail on every hot-ILM expiry.
  mediaCacheImage: process.env.MEDIA_CACHE_IMAGE_BUCKET || legacyCacheBucket
}
module.exports = { ...service, buckets }
