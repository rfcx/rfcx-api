// var verbose_logging = (process.env.NODE_ENV !== "production");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var requireUser = require("../../../middleware/authorization/authorization").requireTokenType("user");
var httpError = require("../../../utils/http-errors");
// var sensationsService = require("../../../services/sensations/sensations-service");
var ValidationError = require("../../../utils/converter/validation-error");
var usersService = require('../../../services/users/users-service');
var messagesService = require('../../../services/messages/messages-service');
var sequelize = require("sequelize");
var Promise = require("bluebird");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;

router.route("/")
  .post(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {

    // map HTTP params to service params
    var serviceParams = {
      text: req.body.text,
      time: req.body.time,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };

    usersService.getUserByGuid(req.rfcx.auth_token_info.guid)
      .then((userFrom) => {
        serviceParams.from_user = userFrom.id;
        if (req.body.userTo) {
          return usersService.getUserByGuid(req.body.userTo);
        }
        return null;
      })
      .then((userTo) => {
        if (userTo) {
          serviceParams.to_user = userTo.id;
        }
        return messagesService.getTypeByName(req.body.type);
      })
      .then((type) => {
        serviceParams.type = type.id;
        return messagesService.createMessage(serviceParams);
      })
      .then((message) => {
        return messagesService.formatMessage(message);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Message couldn't be created.")});
  });

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], { session: false }), hasRole(['rfcxUser']), function (req, res) {

    var serviceParams = {
      after: req.query.after,
      before: req.query.before
    };

    var prePromises = [];

    prePromises.push(req.query.from === undefined? Promise.resolve(undefined) : usersService.getUserByGuid(req.query.from));
    prePromises.push(req.query.to === undefined? Promise.resolve(undefined) : usersService.getUserByGuid(req.query.to));
    prePromises.push(req.query.type === undefined? Promise.resolve(undefined) : messagesService.getTypeByName(req.query.type));

    Promise.all(prePromises)
      .spread(function(fromUser, toUser, type) {
        !!fromUser && (serviceParams.from_user = fromUser.id);
        !!toUser && (serviceParams.to_user = toUser.id);
        !!type && (serviceParams.type = type.id);
        return messagesService.findMessages(serviceParams);
      })
      .then(function(messages) {
        return messagesService.formatMessages(messages);
      })
      .then(result => res.status(200).json(result))
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { console.log('e', e); httpError(req, res, 500, e, "Messages couldn't be founded.")});

  });

module.exports = router;
