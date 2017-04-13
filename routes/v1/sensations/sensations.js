var verbose_logging = (process.env.NODE_ENV !== "production");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var httpError = require("../../../utils/http-errors");
var sensationsService = require("../../../services/sensations/sensations-service");
var ValidationError = require("../../../utils/converter/validation-error");

router.route("/")
  .post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {

    // map HTTP params to service params
    var serviceParams = {
      source_type: req.body.source_type,
      source_id: req.body.source_id,
      data_type: req.body.data_type,
      data_id: req.body.data_id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      starting_after: req.body.starting_after,
      ending_before: req.body.ending_before
    };

    // call service and deal with success & failure
    sensationsService.createSensations(serviceParams)
      .then(result => res.status(200).json(result))
      // if the user supplied wrong arguments we want to give an error message and have a 400 error code
      .catch(ValidationError, e => httpError(res, 400, null, e.message))
      // catch-all for any other that is not based on user input
      .catch(e => httpError(res, 500, e, "Sensations couldn't be created."));
  });

module.exports = router;
