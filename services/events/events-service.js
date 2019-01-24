var models = require("../../models");
var sequelize = require("sequelize");
var Promise = require("bluebird");
const moment = require("moment-timezone");
var ValidationError = require('../../utils/converter/validation-error');
var sqlUtils = require("../../utils/misc/sql");
const guardianGroupService = require('../guardians/guardian-group-service');

const eventQueryCountSelect =
  'SELECT GuardianAudioEvent.begins_at, GuardianAudioEvent.ends_at, Site.timezone as site_timezone ';

const eventQuerySelect =
  'SELECT GuardianAudioEvent.guid, GuardianAudioEvent.confidence, GuardianAudioEvent.windows, ' +
    'GuardianAudioEvent.begins_at, GuardianAudioEvent.ends_at, GuardianAudioEvent.shadow_latitude, ' +
    'GuardianAudioEvent.shadow_longitude, GuardianAudioEvent.reviewer_confirmed, GuardianAudioEvent.created_at, ' +
    'GuardianAudioEvent.updated_at, GuardianAudioEvent.comment, GuardianAudioEvent.audio_guid, ' +
    'CONVERT_TZ(GuardianAudioEvent.begins_at, "UTC", Site.timezone) as begins_at_local, ' +
    'CONVERT_TZ(GuardianAudioEvent.ends_at, "UTC", Site.timezone) as ends_at_local, ' +
    'Site.guid AS site_guid, Site.timezone as site_timezone, ' +
    'Guardian.guid AS guardian_guid, Guardian.shortname AS guardian_shortname, ' +
    'Model.guid AS model_guid, Model.minimal_detection_confidence AS model_minimal_detection_confidence, ' +
      'Model.shortname AS model_shortname, ' +
    'User.guid AS user_guid, ' +
    'EventType.value AS event_type, ' +
    'EventValue.value AS event_value, ' +
    'Reason.name AS reason_for_creation ';

const eventQueryJoins =
  'LEFT JOIN Guardians AS Guardian ON GuardianAudioEvent.guardian = Guardian.id ' +
  'LEFT JOIN GuardianSites AS Site ON Guardian.site_id = Site.id ' +
  'LEFT JOIN AudioAnalysisModels AS Model ON GuardianAudioEvent.model = Model.id ' +
  'LEFT JOIN Users AS User ON GuardianAudioEvent.reviewed_by = User.id ' +
  'LEFT JOIN GuardianAudioEventTypes AS EventType ON GuardianAudioEvent.type = EventType.id ' +
  'LEFT JOIN GuardianAudioEventValues AS EventValue ON GuardianAudioEvent.value = EventValue.id ' +
  'LEFT JOIN GuardianAudioEventReasonsForCreation AS Reason ON GuardianAudioEvent.reason_for_creation = Reason.id ';

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
        order = 'GuardianAudioEvent.audio_guid';
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
        order = 'GuardianAudioEvent.begins_at';
        break;
    }
  }

  let opts = {
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
    guardianGroups: req.query.guardian_groups? (Array.isArray(req.query.guardian_groups)? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
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
    order: order? order : 'GuardianAudioEvent.begins_at',
    dir: dir? dir : 'ASC',
  };

  if (opts.guardianGroups) {
    return guardianGroupService.getGroupsByShortnames(opts.guardianGroups)
      .then((groups) => {
        let guardians = [];
        let values = [];
        groups.forEach((group) => {
          group.Guardians.forEach((guardian) => {
            if (!guardians.includes(guardian.guid)) {
              guardians.push(guardian.guid);
            }
          });
          group.GuardianAudioEventValues.forEach((value) => {
            if (!values.includes(value.value)) {
              values.push(value.value);
            }
          });
        });
        opts.guardians = guardians;
        opts.values = values;
        return opts;
      });
  }
  else {
    return Promise.resolve(opts);
  }
}

/*
  omit_false_positives:true && omit_unreviewed:false => null, true
  omit_false_positives:false && omit_unreviewed:false => null, true, false
  omit_false_positives:true && omit_unreviewed:true => true
  omit_false_positives:false && omit_unreviewed:true => true, false

  omit_false_positives:true && omit_reviewed:false => null, true
  omit_false_positives:false && omit_reviewed:false => null, true, false
  omit_false_positives:true && omit_reviewed:true => null
  omit_false_positives:false && omit_reviewed:true => null
*/

function addGetQueryParams(sql, opts) {
  sql = sqlUtils.condAdd(sql, true, ' AND !(Guardian.latitude = 0 AND Guardian.longitude = 0)');
  sql = sqlUtils.condAdd(sql, true, ' AND !(GuardianAudioEvent.shadow_latitude = 0 AND GuardianAudioEvent.shadow_longitude = 0)');
  sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudioEvent.updated_at > :updatedAfter');
  sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudioEvent.updated_at < :updatedBefore');
  sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudioEvent.created_at > :createdAfter');
  sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudioEvent.created_at < :createdBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudioEvent.begins_at > :startingAfter');
  sql = sqlUtils.condAdd(sql, opts.endingBefore, ' AND GuardianAudioEvent.ends_at < :endingBefore');
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND GuardianAudioEvent.begins_at > DATE_SUB(:startingAfterLocal, INTERVAL 12 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.endingBeforeLocal, ' AND GuardianAudioEvent.ends_at < DATE_ADD(:endingBeforeLocal, INTERVAL 14 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND GuardianAudioEvent.confidence >= :minimumConfidence');
  sql = sqlUtils.condAdd(sql, opts.types, ' AND EventType.value IN (:types)');
  sql = sqlUtils.condAdd(sql, opts.values, ' AND EventValue.value IN (:values)');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND Site.guid IN (:sites)');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND Guardian.guid IN (:guardians)');
  sql = sqlUtils.condAdd(sql, opts.models, ' AND (Model.guid IN (:models) OR Model.shortname IN (:models))');
  sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') !== -1, ' AND (Reason.name IN (:reasonsForCreation) OR GuardianAudioEvent.reason_for_creation IS NULL)');
  sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') === -1, ' AND Reason.name IN (:reasonsForCreation)');
  sql = sqlUtils.condAdd(sql, !opts.showExperimental, ' AND Model.experimental IS NOT TRUE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && !opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT FALSE');
  sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS TRUE');
  sql = sqlUtils.condAdd(sql, !opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT NULL');
  sql = sqlUtils.condAdd(sql, opts.omitReviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NULL');
  sql = sqlUtils.condAdd(sql, opts.search, ' AND (GuardianAudioEvent.guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR GuardianAudioEvent.audio_guid LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Guardian.guid LIKE :search OR Guardian.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR Model.guid LIKE :search OR Model.shortname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR User.email LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventType.value LIKE :search');
  sql = sqlUtils.condAdd(sql, opts.search, ' OR EventValue.value LIKE :search)');
  return sql;
}

function countData(req) {

  return prepareOpts(req)
    .then((opts) => {
      let sql = `${eventQueryCountSelect} FROM GuardianAudioEvents AS GuardianAudioEvent ${eventQueryJoins} `;
      sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
      sql = addGetQueryParams(sql, opts);

      return models.sequelize
        .query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
        .then((events) => {
          let evs = filterEventsWithTz(opts, events);
          return evs.length;
        });
    });

}

function queryData(req) {

  return prepareOpts(req)
    .then((opts) => {
      let sql = `${eventQuerySelect} FROM GuardianAudioEvents AS GuardianAudioEvent ${eventQueryJoins} `;
      sql = sqlUtils.condAdd(sql, true, ' WHERE 1=1');
      sql = addGetQueryParams(sql, opts);
      sql = sqlUtils.condAdd(sql, opts.order, ' ORDER BY ' + opts.order + ' ' + opts.dir);
      sql = sqlUtils.condAdd(sql, true, ' LIMIT :limit OFFSET :offset');

      return models.sequelize
        .query(sql,
          { replacements: opts, type: models.sequelize.QueryTypes.SELECT }
        )
        .then((events) => {
          return filterEventsWithTz(opts, events);
        });
    });

}

function filterEventsWithTz(opts, events) {
  return events.filter((event) => {
    let beginsAtTz = moment.tz(event.begins_at, event.site_timezone),
        endsAtTz = moment.tz(event.ends_at, event.site_timezone);

    if (opts.startingAfterLocal) {
      if (beginsAtTz < moment.tz(opts.startingAfterLocal, event.site_timezone)) {
        return false;
      }
    }
    if (opts.endingBeforeLocal) {
      if (endsAtTz > moment.tz(opts.endingBeforeLocal, event.site_timezone)) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (beginsAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || endsAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (beginsAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && endsAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (beginsAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false;
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (endsAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.weekdays) { // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if ( !opts.weekdays.includes( `${parseInt(beginsAtTz.format('E')) - 1}` ) ) {
        return false;
      }
    }
    return true;
  });
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

function getEventByGuid(guid) {
  let sql = eventQueryBase + 'WHERE GuardianAudioEvent.guid = :guid;';
  return models.sequelize
    .query(sql, { replacements: { guid: guid }, type: models.sequelize.QueryTypes.SELECT })
    .then((event) => {
      if (!event.length) {
        throw new sequelize.EmptyResultError('Event with given guid not found.');
      }
      return event;
    });
}

function updateEventReview(guid, confirmed, user_id) {

  return models.GuardianAudioEvent
    .findOne({
      where: { guid: guid },
      include: [
        {
          model: models.User,
          as: 'User',
          attributes: [
            'guid',
            'firstname',
            'lastname',
            'email'
          ]
        },
      ]
    })
    .then((event) => {
      if (!event) {
        throw new sequelize.EmptyResultError('Event with given guid not found.');
      }
      else {
        event.reviewer_confirmed = confirmed;
        event.reviewed_by = user_id;
        return event.save();
      }
    })
    .then((event) => {
      // reload event to refresh included models
      return event.reload();
    })
    .then((event) => {
      return {
        guid: event.guid,
        reviewer_confirmed: event.reviewer_confirmed,
        reviewer_guid: event.User? event.User.guid : null,
        reviewer_firstname: event.User? event.User.firstname : null,
        reviewer_lastname: event.User? event.User.lastname : null,
        reviewer_email: event.User? event.User.email : null
      }
    });
}

function updateEventComment(guid, comment) {

  if (typeof comment !== 'string' && !(comment instanceof String)) {
    throw new ValidationError('comment attribute must be a string');
  }

  return models.GuardianAudioEvent
    .findOne({
      where: { guid },
    })
    .then((event) => {
      if (!event) {
        throw new sequelize.EmptyResultError('Event with given guid not found.');
      }
      else {
        event.comment = comment;
        return event.save();
      }
    })
    .then((event) => {
      return event.reload({include: [{ all: true } ]});
    });

}

function prepareWsObject(event, site) {
  let timezone = site.timezone;
  let guardian = event.Guardian;
  return {
    time: {
      start: {
        UTC: moment.tz(event.begins_at, timezone).toISOString(),
        localTime: moment.tz(event.begins_at, timezone).format(),
        timeZone: timezone
      },
      end: {
        UTC: moment.tz(event.ends_at, timezone).toISOString(),
        localTime: moment.tz(event.ends_at, timezone).format(),
        timeZone: timezone
      }
    },
    location: {
      coordinates: [guardian.longitude, guardian.latitude, site.guid],
      type: 'point'
    },
    type: event.Type.value,
    value: event.Value.value,
    probability: event.confidence,
    sensationGuids: [event.Audio.guid],
    cognitionGuid: event.guid
  }
}

module.exports = {
  prepareOpts,
  addGetQueryParams,
  countData,
  queryData,
  processStatsByDates,
  getEventByGuid,
  updateEventReview,
  eventQueryCountSelect,
  eventQuerySelect,
  eventQueryJoins,
  prepareWsObject,
  updateEventComment,
};
