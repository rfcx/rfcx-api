const path = require('path')
const router = require('express').Router()
const { EmptyResultError } = require('../../../common/error-handling/errors')
const { httpErrorHandler } = require('../../../common/error-handling/http')
const streamSegmentDao = require('../../stream-segments/dao')
const { parseFileNameAttrs, checkAttrsValidity } = require('../../stream-segments/bl/segment-file-parsing')
const { getFile } = require('../../stream-segments/bl/segment-file-utils')
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
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension', 'availability'],
      strict: false,
      readableBy
    })
    let segments = queryData.results
    if (!segments.length) {
      throw new EmptyResultError('No audio files found for selected time range.')
    }
    segments.forEach(segment => {
      /*
       availability 0 is unavailable
       availability 1 is available
       availability 2 is cold storage
       */
      if (segment.availability !== 1) {
        throw new EmptyResultError('Some audio segments are not available for selected time range')
      }
    })
    segments = streamSegmentDao.removeDuplicates(segments)
    const nextTimestamp = await streamSegmentDao.getNextSegmentTimeAfterSegment(segments[segments.length - 1], end)
    return await getFile(req, res, attrs, fileExtension, segments, nextTimestamp)
  }).catch(httpErrorHandler(req, res, 'Failed getting stream asset'))
})

module.exports = router
