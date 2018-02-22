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
var hasRole = require('../../../middleware/authorization/authorization').hasRole;

router.route("/")
  .post(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    var serviceParams = {
      name: req.body.name,
      type: req.body.type || null,
      json: req.body.json,
    };

    filterPresetsService.doesNameExist(serviceParams.name)
      .then((exist) => {
        if (exist) {
          throw new ValidationError('Filter preset with this name already exist.');
        }
        return true;
      })
      .then(() => {
        return usersService.getUserByGuid(req.rfcx.auth_token_info.guid);
      })
      .then((user) => {
        serviceParams.created_by = user.id;
        serviceParams.updated_by = user.id;
        return filterPresetsService.createFilterPreset(serviceParams);
      })
      .then((filterPreset) => {
        return filterPresetsService.formatFilterPreset(filterPreset);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Filter preset couldn't be created.")});
  });

router.route("/:guid")
  .post(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    var serviceParams = {
      json: req.body.json,
    };

    usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .bind({})
      .then((user) => {
        this.user = user;
        serviceParams.updated_by = user.id;
        return filterPresetsService.getFilterPresetByGuid(req.params.guid);
      })
      .then((filterPreset) => {
        if (filterPreset.UserCreated.guid !== this.user.guid) {
          throw new ValidationError('Only user who created filter preset can update it.')
        }
        return filterPresetsService.updateFilterPreset(filterPreset, serviceParams);
      })
      .then((filterPreset) => {
        return filterPresetsService.formatFilterPreset(filterPreset);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Filter preset couldn't be updated.")});
  });

router.route("/:guid")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    filterPresetsService.getFilterPresetByGuid(req.params.guid)
      .then((filterPreset) => {
        return filterPresetsService.formatFilterPreset(filterPreset);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Can't get filter preset")});
  });

router.route("/")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    let serviceParams = {
      type: req.query.type || null,
    };

    filterPresetsService.getFilterPresets(serviceParams)
      .then((filterPresets) => {
        return filterPresets.map((filterPreset) => {
          return filterPresetsService.formatFilterPreset(filterPreset);
        });
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Can't get filter presets")});
  });

module.exports = router;
