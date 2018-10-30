var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var httpError = require("../../../utils/http-errors.js");
var ValidationError = require("../../../utils/converter/validation-error");
var usersService = require('../../../services/users/users-service');
var sequelize = require("sequelize");
var ApiConverter = require("../../../utils/api-converter");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
var Converter = require("../../../utils/converter/converter");


router.route("/:user_id/device/register")
  .post((req, res) => {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('token').toString();
    params.convert('os').optional().toString();

    params.validate()
      .then(() => {
        // return usersService.getUserByGuidOrEmail(req.params.user_id);
      })
      .then((user) => {

      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch((err) => {
        res.status(500).json({ err });
      });

  });

module.exports = router;
