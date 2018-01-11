var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var httpError = require("../../../utils/http-errors");
var ValidationError = require("../../../utils/converter/validation-error");
var usersService = require('../../../services/users/users-service');
var filterPresetsService = require('../../../services/filter-presets/filter-presets');
var sequelize = require("sequelize");
var Promise = require("bluebird");

router.route("/")
  .post(passport.authenticate("token", {session: false}), requireUser, function (req, res) {

    var serviceParams = {
      type: req.body.type || null,
      json: req.body.json,
    };

    usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then((user) => {
        serviceParams.created_by = user.id;
        serviceParams.updated_by = user.id;
        return filterPresetsService.createFilterPreset(serviceParams);
      })
      .then((filterPreset) => {
        return filterPresetsService.formatFilterPreset(filterPreset);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(res, 404, null, e.message))
      .catch(ValidationError, e => httpError(res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(res, 500, e, "Filter preset couldn't be created.")});
  });

module.exports = router;
