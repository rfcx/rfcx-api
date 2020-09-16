const router = require('express').Router()
const EmptyResultError = require('../../../utils/converter/empty-result-error')
const { httpErrorHandler } = require('../../../utils/http-error-handler.js')
const { authenticatedWithRoles } = require('../../../middleware/authorization/authorization')

const streamsService = require('../../../services/streams')
const streamSegmentService = require('../../../services/streams/stream-segment')
const streamsAssetsService = require('../../../services/streams/assets')
const streamPermissionService = require('../../../services/streams/permission')
const ForbiddenError = require('../../../utils/converter/forbidden-error')

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
    r  = frequency filter. "full" by default. two integers jointed with dot in case we need to filter audio (NOT IMPLEMENTED YET)
    g  = gain (volume) (int/float) 1 by default, which means 100% volume. 0 means no sound. 0.5 - 50% of volume 2 - double volume
    f  = file type (spec, wav, opus, flac, mp3)
    d  = dimension e.g. 200x512 (for file type spec only)
    w  = window function dolph by default (for file type spec only)
    z  = contrast of spectrogram (int) possible range is between 20 and 180 (for file type spec only)
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
 *                      `r`  = (**NOT YET IMPLEMENTED**) frequency filter. "full" by default. two integers jointed with dot in case we need to filter audio (e,g, `rfull`)</br>
 *                      `g`  = gain (volume) (int/float) `1` by default, which means 100% volume. `0` means no sound. `0.5` - 50% of volume. `2` - 200% volume (e,g, `g1`)</br>
 *                      `f`  = file type (spec, wav, opus, flac, mp3) (e.g. `fwav`)</br>
 *                      `d`  = dimension e.g. 200x512 (for file type spec only) (e.g. `d600.512`)</br>
 *                      `w`  = window function dolph by default (for file type spec only) (e,g, `wdolph`)</br>
 *                      `z`  = contrast of spectrogram (int) possible range is between 20 and 180 (for file type spec only) (e.g. `z120`)</br>
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

router.get('/streams/:attrs', authenticatedWithRoles('appUser', 'rfcxUser'), async function (req, res) {
  try {
    const attrs = await streamsAssetsService.parseFileNameAttrs(req)
    await streamsAssetsService.checkAttrsValidity(req, attrs)
    const stream = await streamsService.getById(attrs.streamId)
    const stream_id = stream.id // eslint-disable-line camelcase
    const allowed = await streamPermissionService.hasPermission(req.rfcx.auth_token_info.owner_id, stream, 'R')
    if (!allowed) {
      throw new ForbiddenError('You do not have permission to access this stream.')
    }
    const start = streamsAssetsService.gluedDateToISO(attrs.time.starts)
    const end = streamsAssetsService.gluedDateToISO(attrs.time.ends)
    const queryData = await streamSegmentService.query({ stream_id, start, end }, { joinRelations: true })
    const segments = queryData.streamSegments
    if (!segments.length) {
      throw new EmptyResultError('No audio files found for selected time range.')
    }
    const nextTimestamp = await streamSegmentService.getNextSegmentTimeAfterSegment(segments[segments.length - 1], end)
    return await streamsAssetsService.getFile(req, res, attrs, segments, nextTimestamp)
  } catch (e) {
    httpErrorHandler(req, res, 'Failed getting stream asset.')(e)
  }
})

module.exports = router
