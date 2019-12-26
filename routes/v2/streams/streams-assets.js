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
    65c07254-3801-4de8-b107-bb18167a0f22_s20190907T004300Z_e20190907T005202Z_g0_sr12000_fspec_d200x512_wdolph_z95.png
  Audio format (fwav , fopus, fflac, fmp3):
    65c07254-3801-4de8-b107-bb18167a0f22_s20190907T004300Z_e20190907T005202Z_g0_sr12000_fwav.wav

  First part of the filename is the stream id 65c07254-3801-4de8-b107-bb18167a0f22
  All following parameters are separated by _ and start with a single character that identifies the parameter type
    s  = start timestamp (ISO format without dashes or colons)
    e  = end timestamp
    f  = file type (spec, wav, opus, flac, mp3)
    sr = sample rate
    g  = gain (int)
    d  = dimension e.g. 200x512 (for file type spec only)
    w  = window function e.g. dolph (for file type spec only)
    z  = contrast of spectrogram (int) (for file type spec only)
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
        return streamsAssetsService.getSegments({ streamId: dbStream.id, starts: attrs.starts, ends: attrs.ends });
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
