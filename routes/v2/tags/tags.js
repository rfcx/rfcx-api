const express = require("express");
var router = express.Router();
const sequelize = require("sequelize");
const moment = require("moment-timezone");
const path = require('path');
const passport = require("passport");
const httpError = require("../../../utils/http-errors.js");
const archiveUtil = require('../../../utils/misc/archive');
const dirUtil = require('../../../utils/misc/dir');
const fileUtil = require('../../../utils/misc/file');
const guidUtil = require('../../../utils/misc/guid');
const eventsServiceNeo4j = require('../../../services/events/events-service-neo4j');
const boxesService = require('../../../services/audio/boxes-service');
const audioUtils = require('../../../utils/rfcx-audio/audio-serve').audioUtils;
// const usersService = require('../../../services/users/users-service');
// const usersServiceNeo4j = require('../../../services/users/users-service-neo4j');
const ValidationError = require("../../../utils/converter/validation-error");
const EmptyResultError = require('../../../utils/converter/empty-result-error');
const guardiansService = require('../../../services/guardians/guardians-service');
const hasRole = require('../../../middleware/authorization/authorization').hasRole;
const Converter = require("../../../utils/converter/converter");
const loggers = require('../../../utils/logger')

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

router.route("/")
  .get(passport.authenticate(['token', 'jwt', 'jwt-custom'], {session: false}), hasRole(['rfcxUser', 'systemUser']), function (req, res) {

    req.query.limit = req.query.limit || 1000;
    req.query.starting_after_local = req.query.starting_after_local || moment().subtract(1, 'months').startOf('day').toISOString();
    req.query.starting_before_local = req.query.starting_before_local || moment().endOf('day').toISOString();

    let transformedParams = {};
    let params = new Converter(req.query, transformedParams);

    params.convert('type').toString().isEqualToAny(['annotation', 'inference', 'inference:confirmed', 'inference:rejected']);

    return params.validate()
      .then(() => {
        if (['inference', 'inference:confirmed', 'inference:rejected'].includes(req.query.type)) {
          if (['inference:confirmed', 'inference:rejected'].includes(req.query.type)) {
            req.query.reviewed = 'true';
          }
          // Set include_windows true by default for this endpoint
          req.query.include_windows = req.query.include_windows !== undefined? req.query.include_windows : 'true';
          return eventsServiceNeo4j.queryData(req)
            .bind({})
            .then((eventsData) => {
              this.eventsData = eventsData;
              return eventsServiceNeo4j.formatEventsAsTags(eventsData.events, req.query.type);
            })
            .then((tags) => {
              return tags;
            });
        }
        else {
          return boxesService.getData(req)
            .then((data) => {
              boxesService.calculateTimeOffsetsInSeconds(data.labels);
              return data;
            })
            .then((boxesData) => {
              return boxesService.formatBoxesAsTags(boxesData.labels);
            });
        }
      })
      .then((json) => {
        res.status(200).send(json);
      })
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(sequelize.EmptyResultError, e => { httpError(req, res, 404, null, e.message); })
      .catch(e => { httpError(req, res, 500, e, `Error while getting tags`); console.log(e) });

  });

module.exports = router;
