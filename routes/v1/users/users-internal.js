var models  = require("../../../models");
var express = require("express");
var router = express.Router();
var hash = require("../../../utils/misc/hash.js").hash;
var token = require("../../../utils/internal-rfcx/token.js").token;
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var passport = require("passport");
var moment = require('moment');
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
const executeService = require('../../../services/execute-service');
const mailService = require('../../../services/mail/mail-service');
var sensationsService = require("../../../services/sensations/sensations-service");
var ValidationError = require("../../../utils/converter/validation-error");
var usersService = require('../../../services/users/users-service');
var sitesService = require('../../../services/sites/sites-service');
var auth0Service = require('../../../services/auth0/auth0-service');
var tokensService = require('../../../services/tokens/tokens-service');
var sequelize = require("sequelize");
var ApiConverter = require("../../../utils/api-converter");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
var Converter = require("../../../utils/converter/converter");

router.route("/auth0/export-link")
  .get(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['usersAdmin']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('connection_id').optional().toString();
    params.convert('limit').optional().toString();
    params.convert('fields').optional().toArray();

    params.validate()
      .then(() => {
        return auth0Service.getToken();
      })
      .bind({})
      .then((token) => {
        this.token = token;
        console.log('\ntransformedParams\n', transformedParams);
        console.log('\ntoken\n', this.token);
        // use for getting all users by connections with database
        return auth0Service.getAllUsersForExports(token, transformedParams);
      })
      .then((data) => {
        // use for uploading csv or json file with sorting users by fields
        console.log('\njob_ID\n', data);
        return auth0Service.getAjob( this.token, data);
      })
      .then((data) => {
        console.log('data for uploading users', data);
        res.status(200).json(data);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch((err) => {
        console.log('\nerror\n', err);
        res.status(500).json({ err });
      });

});

router.route("/auth0/fix-users-names")
  .post(passport.authenticate(['jwt', 'jwt-custom'], {session: false}), hasRole(['usersAdmin']), function (req, res) {

    let transformedParams = {};
    let params = new Converter(req.body, transformedParams);

    params.convert('users').toArray();

    params.validate()
      .then(() => {
        return auth0Service.getToken();
      })
      .then((token) => {
        let proms = [];
        if (transformedParams.users) {
          transformedParams.users.forEach((user) => {
            if (!user.given_name && !user.family_name) {
              return true;
            }
            else {
              let opts = {
                user_id: user.user_id,
                given_name: user.given_name,
                family_name: user.family_name,
                name: user.name
              }
              console.log('\ntransformedParams\n', opts);
              proms.push(auth0Service.updateAuth0User(token, opts));
            }
          })
        }
        return Promise.all(proms);
      })
      .then((users) => {
        console.log('users', users);
        res.status(200).json(users);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch((err) => {
        console.log('\nerror\n', err);
        res.status(500).json({ err });
      });

  });

module.exports = router;
