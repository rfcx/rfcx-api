var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var sequelize = require("sequelize");
var ValidationError = require("../../../utils/converter/validation-error");
var ForbiddenError = require("../../../utils/converter/forbidden-error");
var EmptyResultError = require('../../../utils/converter/empty-result-error');
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
const streamsService = require('../../../services/streams/streams-service');
const streamsAssetsService = require('../../../services/streams/streams-assets-service');

/**
  Spectrogram format (fspec):
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fspec_d600.512_wdolph_z120.png
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fspec_d600.512_wdolph_z120.png
  Audio format (fwav , fopus, fflac, fmp3):
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_rfull_g1_fwav.wav
    ij4yexu6o52d_t20191227T134400000Z.20191227T134420000Z_r100.2000_g1.5_fwav.wav

  First part of the filename is the stream id 65c07254-3801-4de8-b107-bb18167a0f22
  All following parameters are separated by _ and start with a single character that identifies the parameter type
    t  = start-end time range jointed with dot (custom format). includes milliseconds
    r  = frequency filter. "full" by default. two integers jointed with dot in case we need to filter audio (NOT IMPLEMENTED YET)
    g  = gain (volume) (int/float) 1 by default, which means 100% volume. 0 means no sound. 0.5 - 50% of volume 2 - double volume
    f  = file type (spec, wav, opus, flac, mp3)
    d  = dimension e.g. 200x512 (for file type spec only)
    w  = window function dolph by default (for file type spec only)
    z  = contrast of spectrogram (int) possible range is between 20 and 180 (for file type spec only)
*/

router.route("/assets/:attrs")
  .get(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let attrs;

    return streamsAssetsService.parseFileNameAttrs(req)
      .then((data) => {
        attrs = data;
        return streamsAssetsService.areFileNameAttrsValid(req, attrs);
      })
      .then(() => {
        return streamsService.getStreamByGuid(attrs.streamGuid);
      })
      .then((dbStream) => {
        streamsService.checkUserAccessToStream(req, dbStream);
        return streamsAssetsService.getSegments({ streamId: dbStream.id, starts: attrs.time.starts, ends: attrs.time.ends });
      })
      .then((segments) => {
        if (!segments.length) {
          throw new EmptyResultError('No audio files found for selected time range.');
        }
        return streamsAssetsService.generateFile(req, res, attrs, segments);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ForbiddenError, e => { httpError(req, res, 403, null, e.message) })
      .catch(EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while querying the stream."); console.log(e) });

  })

module.exports = router;
