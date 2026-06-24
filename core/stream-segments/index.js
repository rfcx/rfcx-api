const router = require('express').Router()
const { createPerPrincipalRateLimit } = require('../../common/middleware/rate-limit/per-principal')

// Per-principal cap on full-segment-FILE downloads. This endpoint 302-redirects
// to a signed object URL for the whole audio segment; a single caller pulling
// these in a tight loop can bulk-export an entire (public) stream archive and
// hammer storage. Cap per authenticated principal; super/system callers bypass.
// In-memory + per-replica (see middleware notes); env-tunable.
const segmentFileRateLimit = createPerPrincipalRateLimit({
  windowMs: parseInt(process.env.SEGMENT_FILE_RATE_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.SEGMENT_FILE_RATE_MAX || '120', 10),
  message: 'Too many segment file downloads. Please slow down or contact the Arbimon team to arrange a bulk export.'
})

router.get('/:id/segments', require('./list'))
router.get('/:id/segments/:start', require('./get'))
router.get('/:id/segments/:start/file', segmentFileRateLimit, require('./file'))

module.exports = router
