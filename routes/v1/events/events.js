var verbose_logging = (process.env.NODE_ENV !== "production");
var models = require("../../../models");
var express = require("express");
var router = express.Router();
var views = require("../../../views/v1");
var httpError = require("../../../utils/http-errors.js");
var guid = require("../../../utils/misc/guid.js");
var passport = require("passport");
passport.use(require("../../../middleware/passport-token").TokenStrategy);
var Promise = require("bluebird");
var ApiConverter = require("../../../utils/api-converter");
var aws = require("../../../utils/external/aws.js").aws();
var moment = require('moment');
var eventsService = require('../../../services/events/events-service');
var sequelize = require("sequelize");
var sqlUtils = require("../../../utils/misc/sql");
var loggers = require('../../../utils/logger');
// var websocket = require('../../../utils/websocket'); DISABLE WEBSOCKET FOR PROD
var ValidationError = require("../../../utils/converter/validation-error");
var hasRole = require('../../../middleware/authorization/authorization').hasRole;

var logDebug = loggers.debugLogger.log;
var logError = loggers.errorLogger.log;

/**
 * weekdays[] is an array with numbers [0, 1, 2, 3, 4, 5, 6]
 * 0 - Monday, 6 is Sunday
 */

function prepareOpts(req) {

  let order, dir;
  if (req.query.order) {
    order;
    dir = 'ASC';
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase();
    }
    switch (req.query.order) {
      case 'audio_guid':
        order = 'Audio.guid';
        break;
      case 'site':
        order = 'Site.name';
        break;
      case 'guardian_shortname':
        order = 'Guardian.shortname';
        break;
      case 'begins_at':
        order = 'GuardianAudioEvent.begins_at';
        break;
      case 'reviewed_by':
        order = 'User.email';
        break;
      case 'reviewer_confirmed':
        order = 'GuardianAudioEvent.reviewer_confirmed';
        break;
      default:
        order = 'GuardianAudioEvent.guid';
        break;
    }
  }

  return {
    limit: req.query.limit? parseInt(req.query.limit) : 10000,
    offset: req.query.offset? parseInt(req.query.offset) : 0,
    updatedAfter: req.query.updated_after,
    updatedBefore: req.query.updated_before,
    createdAfter: req.query.created_after,
    createdBefore: req.query.created_before,
    startingAfter: req.query.starting_after,
    endingBefore: req.query.ending_before,
    startingAfterLocal: req.query.starting_after_local,
    endingBeforeLocal: req.query.ending_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    minimumConfidence: req.query.minimum_confidence,
    types: req.query.types? (Array.isArray(req.query.types)? req.query.types : [req.query.types]) : undefined,
    values: req.query.values? (Array.isArray(req.query.values)? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    models: req.query.models? (Array.isArray(req.query.models)? req.query.models : [req.query.models]) : undefined,
    excludedGuardians: req.query.excluded_guardians? (Array.isArray(req.query.excluded_guardians)?
                          req.query.excluded_guardians : [req.query.excluded_guardians]) : undefined,
    weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    showExperimental: req.query.showExperimental !== undefined? (req.query.showExperimental === 'true') : undefined,
    omitFalsePositives: req.query.omit_false_positives !== undefined? (req.query.omit_false_positives === 'true') : true,
    omitUnreviewed: req.query.omit_unreviewed !== undefined? (req.query.omit_unreviewed === 'true') : false,
    omitReviewed: req.query.omit_reviewed !== undefined? (req.query.omit_reviewed === 'true') : false,
    reasonsForCreation: req.query.reasons_for_creation? (Array.isArray(req.query.reasons_for_creation)? req.query.reasons_for_creation : [req.query.reasons_for_creation]) : undefined,
    search: req.query.search? '%' + req.query.search + '%' : undefined,
    order: order? order : undefined,
    dir: dir? dir : undefined,
  };
}

function countData(req) {

  const opts = prepareOpts(req);

  let sql = 'SELECT COUNT(*) AS total ' +
                   'FROM GuardianAudioEvents AS GuardianAudioEvent ' +
                   'LEFT JOIN GuardianAudio AS Audio ON GuardianAudioEvent.audio_id = Audio.id ' +
                   'LEFT JOIN GuardianSites AS Site ON Audio.site_id = Site.id ' +
                   'LEFT JOIN Guardians AS Guardian ON Audio.guardian_id = Guardian.id ' +
                   'LEFT JOIN AudioAnalysisModels AS Model ON GuardianAudioEvent.model = Model.id ' +
                   'LEFT JOIN Users AS User ON GuardianAudioEvent.reviewed_by = User.id ' +
                   'LEFT JOIN GuardianAudioEventTypes AS EventType ON GuardianAudioEvent.type = EventType.id ' +
                   'LEFT JOIN GuardianAudioEventValues AS EventValue ON GuardianAudioEvent.value = EventValue.id ' +
                   'LEFT JOIN GuardianAudioEventReasonsForCreation AS Reason ON GuardianAudioEvent.reason_for_creation = Reason.id ' +
                   'WHERE 1=1 ';

  sql = sqlUtils.condAdd(sql, true, ' AND !(Guardian.latitude = 0 AND Guardian.longitude = 0)');
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudioEvent.updated_at > :updatedAfter');
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudioEvent.updated_at < :updatedBefore');
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudioEvent.created_at > :createdAfter');
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudioEvent.created_at < :createdBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudioEvent.begins_at > :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.endingBefore, ' AND GuardianAudioEvent.ends_at < :endingBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND (CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :startingAfterLocal');
  sql = sqlUtils.condAdd(sql, opts.endingBeforeLocal, ' AND CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone) < :endingBeforeLocal');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter),
    ' AND TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter' +
    ' AND TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore),
    ' AND (TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter' +
    ' OR TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore)');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore), ' AND TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter');
  sql = sqlUtils.condAdd(sql, (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore), ' AND TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore');
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND GuardianAudioEvent.confidence >= :minimumConfidence');
  sql = sqlUtils.condAdd(sql, opts.types, ' AND EventType.value IN (:types)');
  sql = sqlUtils.condAdd(sql, opts.values, ' AND EventValue.value IN (:values)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');
  sql = sqlUtils.condAdd(sql, opts.models, ' AND (Model.guid IN (:models) OR Model.shortname IN (:models))');
  sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') !== -1, ' AND (Reason.name IN (:reasonsForCreation) OR GuardianAudioEvent.reason_for_creation IS NULL)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') === -1, ' AND Reason.name IN (:reasonsForCreation)');
  sql = sqlUtils.condAdd(sql, !!opts.weekdays, ' AND WEEKDAY(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) IN (:weekdays)');
  sql = sqlUtils.condAdd(sql, !opts.showExperimental, ' AND Model.experimental IS NOT TRUE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && !opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS FALSE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS TRUE');
  sql = sqlUtils.condAdd(sql, !opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT NULL');
  sql = sqlUtils.condAdd(sql, opts.omitReviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NULL');
  sql = sqlUtils.condAdd(sql, opts.search, ' AND (GuardianAudioEvent.guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Audio.guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Guardian.guid LIKE :search OR Guardian.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Model.guid LIKE :search OR Model.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.email LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventType.value LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventValue.value LIKE :search)');

  return models.sequelize.query(sql,
    { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
  )

}

function queryData(req) {

  const opts = prepareOpts(req);

  let sql = eventsService.eventQueryBase + 'WHERE 1=1 ';

  sql = sqlUtils.condAdd(sql, true, ' AND !(Guardian.latitude = 0 AND Guardian.longitude = 0)');
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudioEvent.updated_at > :updatedAfter');
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudioEvent.updated_at < :updatedBefore');
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudioEvent.created_at > :createdAfter');
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudioEvent.created_at < :createdBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudioEvent.begins_at > :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.endingBefore, ' AND GuardianAudioEvent.ends_at < :endingBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND (CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :startingAfterLocal');
  sql = sqlUtils.condAdd(sql, opts.endingBeforeLocal, ' AND CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone) < :endingBeforeLocal');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter),
    ' AND TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter' +
    ' AND TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore),
    ' AND (TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter' +
    ' OR TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore)');
  sql = sqlUtils.condAdd(sql, (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore), ' AND TIME(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) > :dayTimeLocalAfter');
  sql = sqlUtils.condAdd(sql, (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore), ' AND TIME(CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone)) < :dayTimeLocalBefore');
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND GuardianAudioEvent.confidence >= :minimumConfidence');
  sql = sqlUtils.condAdd(sql, opts.types, ' AND EventType.value IN (:types)');
  sql = sqlUtils.condAdd(sql, opts.values, ' AND EventValue.value IN (:values)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');
  sql = sqlUtils.condAdd(sql, opts.models, ' AND (Model.guid IN (:models) OR Model.shortname IN (:models))');
  sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') !== -1, ' AND (Reason.name IN (:reasonsForCreation) OR GuardianAudioEvent.reason_for_creation IS NULL)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') === -1, ' AND Reason.name IN (:reasonsForCreation)');
  sql = sqlUtils.condAdd(sql, !!opts.weekdays, ' AND WEEKDAY(CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone)) IN (:weekdays)');
  sql = sqlUtils.condAdd(sql, !opts.showExperimental, ' AND Model.experimental IS NOT TRUE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && !opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT FALSE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS TRUE');
  sql = sqlUtils.condAdd(sql, !opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT NULL');
  sql = sqlUtils.condAdd(sql, opts.omitReviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NULL');
  sql = sqlUtils.condAdd(sql, opts.search, ' AND (GuardianAudioEvent.guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Audio.guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Guardian.guid LIKE :search OR Guardian.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Model.guid LIKE :search OR Model.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.email LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventType.value LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventValue.value LIKE :search)');
  sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);
  sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

  return models.sequelize.query(sql,
    { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
  )

}

function processStatsByDates(req, res) {
  var contentType = req.rfcx.content_type;
  var isFile = false;
  if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
    isFile = true;
  }

  queryData(req)
    .then(function (dbEvents) {
      if (contentType === 'json') {
        return views.models.guardianAudioEventsByDatesJson(req, res, dbEvents)
          .then(function (json) {
            // if client requested json file, then respond with file
            // if not, respond with simple json
            res.contentType(isFile ? 'text/json' : 'application/json');
            if (isFile) {
              res.attachment('event.json');
            }
            res.status(200).send(json);
          });
      }
      else if (contentType === 'csv') {
        return views.models.guardianAudioEventsByDatesCSV(req, res, dbEvents)
          .then(function (csv) {
            res.contentType('text/csv');
            res.attachment('event.csv');
            res.status(200).send(csv);
          });
      }
    })
    .catch(function (err) {
      console.log('Error while searching Audio Events', arguments);
      res.status(500).json({msg: err});
    });
}

router.route("/event")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    var contentType = req.rfcx.content_type;
    var isFile = false;
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true;
    }

    queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsJson(req, res, dbEvents)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json');
              if (isFile) {
                res.attachment('event.json');
              }
              res.status(200).send(json);
            });
        }
        else if (contentType === 'csv') {
          return views.models.guardianAudioEventsCSV(req, res, dbEvents)
            .then(function (csv) {
              res.contentType('text/csv');
              res.attachment('event.csv');
              res.status(200).send(csv);
            });
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', err);
        res.status(500).json({msg: err});
      });

  });

router.route("/event/datatable")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    countData(req)
      .bind({})
      .then(function(data) {
        this.total = data[0].total;
        return queryData(req);
      })
      .then(function (dbEvents) {
        return views.models.guardianAudioEventsJson(req, res, dbEvents);
      })
      .then(function(json) {
        json.total = this.total;
        res.status(200).send(json);
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', err);
        res.status(500).json({msg: err});
      });

  });

router.route("/stats/guardian")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    var contentType = req.rfcx.content_type;
    var isFile = false;
    if (req.originalUrl.indexOf('.json') !== -1 || req.originalUrl.indexOf('.csv') !== -1) {
      isFile = true;
    }

    queryData(req)
      .then(function (dbEvents) {
        if (contentType === 'json') {
          return views.models.guardianAudioEventsByGuardianJson(req, res, dbEvents)
            .then(function (json) {
              // if client requested json file, then respond with file
              // if not, respond with simple json
              res.contentType(isFile ? 'text/json' : 'application/json');
              if (isFile) {
                res.attachment('event.json');
              }
              res.status(200).send(json);
            });
        }
        else if (contentType === 'csv') {
          return views.models.guardianAudioEventsByGuardianCSV(req, res, dbEvents)
            .then(function (csv) {
              res.contentType('text/csv');
              res.attachment('event.csv');
              res.status(200).send(csv);
            });
        }
      })
      .catch(function (err) {
        console.log('Error while searching Audio Events', arguments);
        res.status(500).json({msg: err});
      });

  });

router.route("/stats/dates")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), processStatsByDates);

router.route("/stats/weekly")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/monthly")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(1, 'month').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/half-year")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(6, 'month').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/stats/year")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function(req, res) {

    if (!req.query) {
      req.query = {};
    }

    var dateStr = moment().subtract(1, 'year').format('YYYY-MM-DD HH:mm:ss');
    req.query.starting_after = dateStr;

    processStatsByDates(req, res);

  });

router.route("/tuning")
  .get(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("event", req);

    var opts = {
      type: req.query.type,
      modelGuid: req.query.modelGuid,
      minWindows: parseInt(req.query.minWindows),
      minProbability: parseFloat(req.query.minProbability),
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    var sql = "SELECT g.shortname, a.guid as audio_guid, a.measured_at, count(t.audio_id) as count, avg(t.confidence) as prob, s.timezone_offset, s.timezone FROM GuardianAudioTags t " +
      "INNER JOIN AudioAnalysisModels m on m.guid=:modelGuid " +
      "INNER JOIN GuardianAudio a on audio_id=a.id " +
      "INNER JOIN GuardianSites s on site_id=s.id " +
      "INNER JOIN Guardians g on g.id=a.guardian_id " +
      "WHERE tagged_by_model=m.id and tagged_by_model is not null and confidence>=:minProbability and value=:type and a.measured_at>=:dateFrom and a.measured_at<:dateTo " +
      "GROUP BY t.audio_id " +
      "HAVING COUNT(t.audio_id)>=:minWindows " +
      "ORDER BY a.measured_at DESC;";

    models.sequelize.query(sql,
      {replacements: opts, type: models.sequelize.QueryTypes.SELECT})
      .then(function (data) {
        var apiEvent = converter.cloneSequelizeToApi(data);
        res.status(200).json(apiEvent);
      })
      .catch(function (err) {
        res.status(500).json({msg: err});
      });

  });

router.route("/values")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {
    eventsService
      .getGuardianAudioEventValues()
      .then((data) => { res.status(200).json(data); })
      .catch(e => httpError(req, res, 500, e, "Could not return Guardian Audio Event Values."));
  });

router.route("/types")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {
    eventsService
      .getGuardianAudioEventTypes()
      .then((data) => { res.status(200).json(data); })
      .catch(e => httpError(req, res, 500, e, "Could not return Guardian Audio Event Types."));
  });

router.route("/:guid")
  .get(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    eventsService
      .getEventByGuid(req.params.guid)
      .then((event) => {
        return views.models.guardianAudioEventsJson(req, res, event);
      })
      .then((data) => {
        res.status(200).json(data.events[0]);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(ValidationError, e => httpError(req, res, 400, null, e.message))
      .catch(e => httpError(req, res, 500, e, "GuardianAudioEvent couldn't be found."));

  })
;

router.route('/')
  .post(passport.authenticate("token", {session: false}), function (req, res) {

    var converter = new ApiConverter("event", req);

    var body = req.body;

    var attrs = {
      confidence: body.confidence,
      windows: body.windows,
      audio_id: body.audio_id,
      type: body.type,
      value: body.value,
      begins_at: body.begins_at,
      ends_at: body.ends_at,
      model: body.model,
      reason_for_creation: body.reason_for_creation || 'pgm', // set `pgm` by default
    };

    // default windows to 0 if none are provided
    // Todo: delete windows altogether
    if (! attrs.windows) {
      attrs.windows = 0;
    }

    function checkAttrValidity() {
      var missingAttrs = '';

      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          if(key == 'begins_at' || key == 'ends_at'){
            continue;
          }
          if (attrs[key] === undefined || attrs[key] === null) {
            missingAttrs += (' ' + key);
          }
        }
      }

      return {
        status: !missingAttrs.length,
        missingAttrsStr: missingAttrs.length ? 'Missing required attributes:' + missingAttrs : null
      };
    }

    var attrsValidity = checkAttrValidity();
    if (!attrsValidity.status) {
      return httpError(req, res, 400, null, attrsValidity.missingAttrsStr);
    }
    if (body.guid && !guid.isValid(body.guid)) {
      return httpError(req, res, 400, null, 'Guardian Audio Event guid has incorrect format');
    }

    var promises = [];

    promises.push(models.GuardianAudio.findOne({
      where: {guid: attrs.audio_id},
      include: [{all: true}]
    }));
    promises.push(models.AudioAnalysisModel.findOne({where: {$or: {shortname: attrs.model, guid: attrs.model}}}));
    promises.push(models.GuardianAudioEventType.findOrCreate({
      where: {$or: {value: attrs.type, id: attrs.type}},
      defaults: {value: attrs.type}
    }));
    promises.push(models.GuardianAudioEventValue.findOrCreate({
      where: {$or: {value: attrs.value, id: attrs.value}},
      defaults: {value: attrs.value}
    }));
    promises.push(models.GuardianAudioEventReasonForCreation.findOne({
      where: {name: attrs.reason_for_creation}
    }));

    Promise.all(promises)
      .bind({})
      .then(function (data) {

        if (!data[0]) {
          httpError(req, res, 404, null, 'Audio with given guid not found');
          return Promise.reject();
        }
        if (!data[0].Guardian) {
          httpError(req, res, 500, null, 'Audio is not associated with any Guardians');
          return Promise.reject();
        }
        if (!data[1]) {
          httpError(req, res, 404, null, 'Model with given shortname/guid not found');
          return Promise.reject();
        }
        if (!data[4]) {
          httpError(req, res, 404, null, 'Reason for Creation with given name not found');
          return Promise.reject();
        }

        if (attrs['begins_at'] === undefined || attrs['begins_at'] === null) {
            attrs.begins_at = data[0].measured_at;
        }
        if (attrs['ends_at'] === undefined || attrs['ends_at'] === null) {
            attrs.ends_at = new Date(data[0].measured_at.getTime() + 1000*90);
        }

        this.dbGuardian = data[0].Guardian;
        this.dbSite = data[0].Site;

        // replace names with ids
        attrs.audio_id = data[0].id;
        this.audio_guid = data[0].guid;
        attrs.model = data[1].id;
        this.model = data[1].shortname;
        attrs.type = data[2][0].id;
        this.type = data[2][0].value;
        attrs.value = data[3][0].id;
        this.value = data[3][0].value;
        attrs.reason_for_creation = data[4].id;

        attrs.guardian = data[0].Guardian.id;
        this.guardian = data[0].Guardian.shortname;
        this.guardian_id = data[0].Guardian.id;
        attrs.shadow_latitude = data[0].Guardian.latitude;
        attrs.shadow_longitude = data[0].Guardian.longitude;

        return models.GuardianAudioEvent
          .findOrCreate({
            where: {
              guid: body.guid
            },
            defaults: attrs
          })
      })
      .spread(function (dbGuardianAudioEvent, created) {
        if (created) {
          dbGuardianAudioEvent.reload({
            include: [{all: true}]
          })
          .then((dbEvent) => {
            // let wsObj = eventsService.prepareWsObject(dbEvent, this.dbSite); DISABLE WEBSOCKET FOR PROD
            // websocket.send('createCognition', wsObj); DISABLE WEBSOCKET FOR PROD
          });
          return Promise.resolve(dbGuardianAudioEvent);
        }
        else {
          return models.GuardianAudioEvent
            .update(attrs, {where: {guid: dbGuardianAudioEvent.guid}})
            .spread(function () {
              return models.GuardianAudioEvent.findOne({where: {guid: dbGuardianAudioEvent.guid}, include: [{all: true}]});
            });
        }
      })
      .then(function (data) {
        var apiEvent = converter.mapSequelizeToApi(data);
        res.status(200).json(apiEvent);
      })
      .then(function () {
        var msg = {
          type: this.type,
          detected: this.value,
          guardian: this.guardian,
          model: this.model,
          audio_guid: this.audio_guid,
          // Todo: generate a proper url string, need some sleep but will replace it tomorrow
          listen: 'https://console.rfcx.org/#/classification?guid=' + this.audio_guid +  '&typevalue=' + this.value + '&access=read'
        };

        // currently we only send out alerts.
        // Todo: this needs to be replaced by a general alert handler that allows for more configuration.
        var excludedGuardians = [];
        if( ! excludedGuardians.includes(this.guardian_id) ){
          let topic = 'rfcx-detection-alerts-' + this.dbSite.guid;
          aws.createTopic(topic)
            .then((data) => {
              return aws.publish(topic, msg);
            })
            .catch((err) => {
              logError('Event creation request: error creating SNS topic', { req: req, err: err });
            });
        }
      })
      .catch(function (err) {
        if (!!err) {
          console.log(err);
          if (err.name && err.name === 'SequelizeValidationError') {
            httpError(req, res, 400, null, 'Input data has incorrect format');
          }
          else {
            httpError(req, res, 500, "database");
          }
        }
      });

  });

router.route("/:event_id/review")
  .post(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    models.GuardianEvent
      .findAll({
        where: {guid: req.params.event_id},
        include: [{all: true}],
        limit: 1
      }).then(function (dbEvent) {

      if (dbEvent.length < 1) {
        httpError(req, res, 404, "database");
      } else {

        var reviewerInput = {
          classification: (req.body.classification != null) ? req.body.classification.toLowerCase() : null,
          begins_at: (req.body.begins_at != null) ? new Date(req.body.begins_at) : null,
          duration: (req.body.duration != null) ? parseInt(req.body.duration) : null,
          invalidated: (req.body.invalidated != null) ? req.body.invalidated : null
        };

        if (reviewerInput.classification != null) {
          dbEvent[0].classification_reviewer = reviewerInput.classification;
        }
        if (reviewerInput.begins_at != null) {
          dbEvent[0].begins_at_reviewer = reviewerInput.begins_at;
        }
        if (reviewerInput.duration != null) {
          dbEvent[0].duration_reviewer = reviewerInput.duration;
        }
        if (reviewerInput.invalidated != null) {
          if (reviewerInput.invalidated == "true") {
            dbEvent[0].invalidated_reviewer = true;
          } else if (reviewerInput.invalidated == "false") {
            dbEvent[0].invalidated_reviewer = false;
          }
        }


        dbEvent[0].reviewed_at = new Date();
        dbEvent[0].reviewer_id = req.rfcx.auth_token_info.owner_id;

        dbEvent[0].save();

        views.models.guardianEvents(req, res, dbEvent)
          .then(function (json) {
            res.status(200).json(json);
          });

      }

    }).catch(function (err) {
      console.log(err);
      if (!!err) {
        httpError(req, res, 500, "database");
      }
    });

  })
;

router.route("/:guid/confirm")
  .post(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    eventsService.updateEventReview(req.params.guid, true, req.rfcx.auth_token_info.owner_id)
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => httpError(req, res, 500, e, "Could not update Event review."));

  });

router.route("/:guid/reject")
  .post(passport.authenticate(['token', 'jwt'], {session: false}), hasRole(['rfcxUser']), function (req, res) {

    eventsService.updateEventReview(req.params.guid, false, req.rfcx.auth_token_info.owner_id)
      .then((data) => {
        res.status(200).json(data);
      })
      .catch(sequelize.EmptyResultError, e => httpError(req, res, 404, null, e.message))
      .catch(e => httpError(req, res, 500, e, "Could not update Event review."));

  });

module.exports = router;
