const util = require('util');
var express = require("express");
var router = express.Router();
const SensationsService = require('../../../services/sensations/sensations-service');
const executeService = require('../../../services/execute-service');
const passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");


router.route("/:guardian_id/coverage")
  .get(passport.authenticate("token",{session:false}),requireUser, function(req,res) {

    var serviceReq = {
      guardian_id: req.params.guardian_id,
      starting_after: req.query.starting_after,
      ending_before: req.query.ending_before,
      interval: req.query.interval
    };

    executeService(req, res, serviceReq, SensationsService.getGuardianCoverage, "Failed to create coverage.");
  })
;

module.exports = router;




