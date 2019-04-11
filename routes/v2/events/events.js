// var verbose_logging = (process.env.NODE_ENV !== "production");
// var models = require("../../../models");
var express = require("express");
var router = express.Router();
// var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
// var guid = require("../../../utils/misc/guid.js");
// var passport = require("passport");
// passport.use(require("../../../middleware/passport-token").TokenStrategy);
var Promise = require("bluebird");
// var ApiConverter = require("../../../utils/api-converter");
// var aws = require("../../../utils/external/aws.js").aws();
// var moment = require('moment');
var eventsServiceNeo4j = require('../../../services/events/events-service-neo4j');
var eventValueService = require('../../../services/events/event-value-service');
var eventTypeService = require('../../../services/events/event-type-service');
// var sequelize = require("sequelize");
// var sqlUtils = require("../../../utils/misc/sql");
// var loggers = require('../../../utils/logger');
var ValidationError = require("../../../utils/converter/validation-error");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;
// var firebaseService = require('../../../services/firebase/firebase-service');
// var guardianGroupService = require('../../../services/guardians/guardian-group-service');

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  // .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {
  .get(function (req, res) {

    // return eventsServiceNeo4j.countData(req)
    //   .bind({})
    //   .then(function(total) {
    //     this.total = total;
    //     return eventsServiceNeo4j.queryData(req);
    //   })
      // .then(function (dbEvents) {
        // return views.models.guardianAudioEventsJson(req, res, dbEvents);
      // })
    return eventsServiceNeo4j.queryData(req)
      .then(function(json) {
        // json.total = this.total;
        res.status(200).send(json);
      })
      // .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => { httpError(req, res, 500, e, "Error while searching events."); console.log(e) });
    // var contentType = req.rfcx.content_type;
    // var isFile = false;
    // if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
    //   isFile = true;
    // }

    // return eventsService.queryData(req)
    //   .then(function (dbEvents) {
    //     if (contentType === 'json') {
    //       return views.models.guardianAudioEventsJson(req, res, dbEvents)
    //         .then(function (json) {
    //           // if client requested json file, then respond with file
    //           // if not, respond with simple json
    //           res.contentType(isFile ? 'text/json' : 'application/json');
    //           if (isFile) {
    //             res.attachment('event.json');
    //           }
    //           res.status(200).send(json);
    //         });
    //     }
    //     else if (contentType === 'csv') {
    //       return views.models.guardianAudioEventsCSV(req, res, dbEvents)
    //         .then(function (csv) {
    //           res.contentType('text/csv');
    //           res.attachment('event.csv');
    //           res.status(200).send(csv);
    //         });
    //     }
    //   })
    //   .catch(function (err) {
    //     console.log('Error while searching Audio Events', err);
    //     res.status(500).json({msg: err});
    //   });

  });

module.exports = router;
