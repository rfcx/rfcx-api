var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var PerceptionsAiService = require("../../../services/perceptions/perceptions-ai-service");
var ValidationError = require("../../../utils/converter/validation-error");

router.route("/ai/:guid")
  .post(passport.authenticate("token",{session:false}), (req, res) => {

    var params = {
      minimal_detected_windows: req.body.minimal_detected_windows,
      minimal_detection_confidence: req.body.minimal_detection_confidence,
      shortname: req.body.shortname,
      event_type: req.body.event_type,
      event_value: req.body.event_value,
      guid: req.params.guid,
      archive: req.files.archive.path
    };



    PerceptionsAiService.createAi(params)
      .then(created => res.status(200).json({
        shortname: params.shortname, guid: params.guid,
        minimal_detection_confidence: params.minimal_detection_confidence,
        minimal_detected_windows: params.minimal_detected_windows, created: created}))
      .catch(ValidationError, e => httpError(res, 400, null, e.message))
      // catch-all for any other that is not based on user input
      .catch(e => httpError(res, 500, e, `Perception Ai couldn't be created: ${e}`));

  });
module.exports = router;
