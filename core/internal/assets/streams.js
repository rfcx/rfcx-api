const path = require('path')
const router = require('express').Router()
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamSegmentDao = require('../../stream-segments/dao')
const { parseFileNameAttrs, checkAttrsValidity } = require('../../stream-segments/bl/segment-file-parsing')
const { getFile, isCached } = require('../../stream-segments/bl/segment-file-utils')
const { gluedDateStrToMoment } = require('../../_utils/datetime/parse')

/**
  Spectrogram format (fspec):
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fspec_d600.512_wdolph_z120.png
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fspec_d600.512_wdolph_z120.png
  Audio format (fwav , fopus, fflac, fmp3):
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fwav.wav
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fwav.wav

  First part of the filename is the stream id `LilSjZJkRK02`
  All following parameters are separated by _ and start with a single character that identifies the parameter type
    t  = start-end time range jointed with dot (custom format). includes milliseconds
    r  = frequency filter. "full" by default. two integers jointed with dot in case we need to filter audio
    g  = gain (volume) (int/float) 1 by default, which means 100% volume. 0 means no sound. 0.5 - 50% of volume 2 - double volume
    f  = file type (spec, wav, opus, flac, mp3)
    d  = dimension e.g. 200x512 (for file type spec only)
    w  = window function dolph by default (for file type spec only)
    z  = contrast of spectrogram (int) possible range is between 20 and 180 (for file type spec only)
    m  = monochrome, to set spectrogram color to greyscale (true, false)
    p  = palette, to set spectrogram color to the available ones (p1 - p4) need `m` to be `false`
*/

/**
 * @swagger
 *
 * /internal/assets/streams/{filename}:
 *   get:
 *     summary: Generate stream asset file (audio or spectrogram)
 *     tags:
 *       - internal
 *     parameters:
 *       - name: filename
 *         description: First part of the filename is the stream id `LilSjZJkRK02`</br>
 *                      All following parameters are separated by _ and start with a single character that identifies the parameter type</br>
 *                      `t`  = start-end time range jointed with dot (custom format). includes milliseconds (e.g. `t20191227T134400000Z.20191227T134420000Z`)</br>
 *                      `r`  = frequency filter. "full" by default. two integers jointed with dot in case we need to filter audio (e,g, `rfull`)</br>
 *                      `g`  = gain (volume) (int/float) `1` by default, which means 100% volume. `0` means no sound. `0.5` - 50% of volume. `2` - 200% volume (e,g, `g1`)</br>
 *                      `f`  = file type (spec, wav, opus, flac, mp3) (e.g. `fwav`)</br>
 *                      `d`  = dimension e.g. 200x512 (for file type spec only) (e.g. `d600.512`)</br>
 *                      `w`  = window function dolph by default (for file type spec only) (e,g, `wdolph`)</br>
 *                      `z`  = contrast of spectrogram (int) possible range is between 20 and 180 (for file type spec only) (e.g. `z120`)</br>
 *                      `m`  = monochrome, to set spectrogram color to greyscale (true, false)</br>
 *                      `p`  = palette, to set spectrogram color to the available ones (p1 - p4) need `m` to be `false`</br>
 *                      Full examples:</br>
 *                      - Spectrogram format (fspec):</br>
 *                      `ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fspec_d600.512_wdolph_z120.png`</br>
 *                      `ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fspec_d600.512_wdolph_z120.png`</br>
 *                      - Audio format (fwav , fopus, fflac, fmp3):</br>
 *                      `ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fwav.wav`</br>
 *                      `ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fwav.wav`</br>
 *         in: query
 *         type: string
 *         required: true
 *         example: ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fspec_d600.512_wdolph_z120.png
 *     responses:
 *       200:
 *         description: Success
 *       403:
 *         description: Insufficient privileges
 */

/**
 * @swagger
 *
 * /internal/assets/streams/{filename}:
 *   head:
 *     summary: Report whether a stream asset is already cached, WITHOUT rendering it
 *     description: >
 *       Same status code a GET would return (200 renderable / 404 no audio in
 *       range), but never renders. Cache state is reported in the
 *       `RFCx-Media-Cache` response header (`HIT` or `MISS`).
 *     tags:
 *       - internal
 *     parameters:
 *       - name: filename
 *         in: path
 *         type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Asset is renderable. See RFCx-Media-Cache for cache state.
 *       403:
 *         description: Insufficient privileges
 *       404:
 *         description: No audio files found for the selected time range
 */

// HEAD -- cache probe (rfcx-local, 2026-08-21).
//
// 🔴 WHY THIS ROUTE HAD TO BE ADDED
// Until now this file declared `router.get` ONLY, so Express dispatched HEAD to
// the GET handler: the full pipeline ran (segment query -> availability checks
// -> getFile -> RENDER + cache write) and only the body was discarded. A "cheap
// existence probe" was therefore one of the most expensive calls in the system.
// Proven by artefact, not by timing: a single HEAD on an uncached-but-renderable
// ROI created the cache object (prefix went 7 -> 8, then 8 -> 9 on a second
// window), and an A/B with an untouched sibling arm ruled out coincidence.
// `git log -S "router.head"` on this file is EMPTY -- it never existed, so this
// is an original design gap rather than a regression.
//
// SEMANTICS (deliberate): this returns the SAME status a GET would -- 200 when
// the asset is renderable, 404 when there is no audio in range -- because RFC
// 9110 requires HEAD to mirror GET minus the body. Reporting 404 for "not
// cached" would tell every other client the asset does not exist. Cache state is
// therefore a HEADER, not a status code.
//
// ⚠️ ONE BEHAVIOUR CHANGE, STATED PLAINLY: HEAD no longer renders, so anything
// that was accidentally relying on HEAD to WARM the cache stops warming it. The
// ROI pre-warm consumer is the only known such caller and is changed in the same
// release -- shipping this alone would silently stop ~98% of ROIs being warmed
// while making its warm/hit counters look better. See rfcx-local
// runbooks/FINDINGS-roi-png-writer-retirement-2026-08-21.md and OPEN-ITEMS §196.
router.head('/streams/:attrs', function (req, res) {
  const fileExtension = path.extname(req.params.attrs).slice(1)
  const fileNameWithoutExtension = path.basename(req.params.attrs, `.${fileExtension}`)
  parseFileNameAttrs(fileNameWithoutExtension).then(async (attrs) => {
    const user = req.rfcx.auth_token_info
    const readableBy = user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id
    await checkAttrsValidity(req, attrs, fileExtension)
    const start = gluedDateStrToMoment(attrs.time.starts)
    const end = gluedDateStrToMoment(attrs.time.ends)
    // Same authorisation + availability gates as GET: a HEAD must not reveal
    // the existence of a stream the caller cannot read.
    const queryData = await streamSegmentDao.query({ streamId: attrs.streamId, start, end }, {
      fields: ['id', 'start', 'end', 'path', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension', 'availability'],
      strict: false,
      readableBy
    })
    const segments = queryData.results
    if (!segments.length) {
      throw new EmptyResultError('No audio files found for selected time range.')
    }
    segments.forEach(segment => {
      if (segment.availability !== 1) {
        throw new EmptyResultError('Unavailable')
      }
    })
    const { cached } = await isCached(req, attrs)
    res.setHeader('RFCx-Media-Cache', cached ? 'HIT' : 'MISS')
    res.setHeader('Access-Control-Expose-Headers', 'RFCx-Media-Cache')
    return res.sendStatus(200)
  }).catch(httpErrorHandler(req, res, 'Failed checking stream asset'))
})

router.get('/streams/:attrs', function (req, res) {
  const fileExtension = path.extname(req.params.attrs).slice(1)
  const fileNameWithoutExtension = path.basename(req.params.attrs, `.${fileExtension}`)
  parseFileNameAttrs(fileNameWithoutExtension).then(async (attrs) => {
    const user = req.rfcx.auth_token_info
    const readableBy = user.is_super || user.has_system_role || user.has_stream_token ? undefined : user.id
    await checkAttrsValidity(req, attrs, fileExtension)
    const start = gluedDateStrToMoment(attrs.time.starts)
    const end = gluedDateStrToMoment(attrs.time.ends)
    const queryData = await streamSegmentDao.query({ streamId: attrs.streamId, start, end }, {
      fields: ['id', 'start', 'end', 'path', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension', 'availability'],
      strict: false,
      readableBy
    })
    let segments = queryData.results
    if (!segments.length) {
      throw new EmptyResultError('No audio files found for selected time range.')
    }
    segments.forEach(segment => {
      /*
       availability 0 is  unavailable
       availability 1 is  available
       availability 2 is  cold storage
       */
      if (segment.availability !== 1) {
        throw new EmptyResultError('Unavailable')
      }
    })
    segments = streamSegmentDao.removeDuplicates(segments)
    const nextTimestamp = await streamSegmentDao.getNextSegmentTimeAfterSegment(segments[segments.length - 1], end)
    return await getFile(req, res, attrs, fileExtension, segments, nextTimestamp)
  }).catch(httpErrorHandler(req, res, 'Failed getting stream asset'))
})

module.exports = router
