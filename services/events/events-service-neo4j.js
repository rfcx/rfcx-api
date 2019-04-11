var Promise = require("bluebird");
const moment = require("moment-timezone");
var ValidationError = require('../../utils/converter/validation-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');

function prepareOpts(req) {

  let order, dir;
  if (req.query.order) {
    order;
    dir = 'ASC';
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase();
    }
    switch (req.query.order) {
      case 'measured_at':
        order = 'ev.audioMeasuredAt';
        break;
      default:
        order = 'ev.audioMeasuredAt';
        break;
    }
  }

  let opts = {
    limit: req.query.limit? parseInt(req.query.limit) : 10000,
    offset: req.query.offset? parseInt(req.query.offset) : 0,
    // updatedAfter: req.query.updated_after,
    // updatedBefore: req.query.updated_before,
    createdAfter: req.query.created_after,
    createdBefore: req.query.created_before,
    startingAfter: req.query.starting_after,
    endingBefore: req.query.ending_before,
    startingAfterLocal: req.query.starting_after_local,
    endingBeforeLocal: req.query.ending_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    minimumConfidence: req.query.minimum_confidence? parseFloat(req.query.minimum_confidence) : undefined,
    // types: req.query.types? (Array.isArray(req.query.types)? req.query.types : [req.query.types]) : undefined,
    values: req.query.values? (Array.isArray(req.query.values)? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    // guardianGroups: req.query.guardian_groups? (Array.isArray(req.query.guardian_groups)? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
    models: req.query.models? (Array.isArray(req.query.models)? req.query.models : [req.query.models]) : undefined,
    // excludedGuardians: req.query.excluded_guardians? (Array.isArray(req.query.excluded_guardians)?
    //                       req.query.excluded_guardians : [req.query.excluded_guardians]) : undefined,
    weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    // showExperimental: req.query.showExperimental !== undefined? (req.query.showExperimental === 'true') : undefined,
    // omitFalsePositives: req.query.omit_false_positives !== undefined? (req.query.omit_false_positives === 'true') : true,
    // omitUnreviewed: req.query.omit_unreviewed !== undefined? (req.query.omit_unreviewed === 'true') : false,
    // omitReviewed: req.query.omit_reviewed !== undefined? (req.query.omit_reviewed === 'true') : false,
    // reasonsForCreation: req.query.reasons_for_creation? (Array.isArray(req.query.reasons_for_creation)? req.query.reasons_for_creation : [req.query.reasons_for_creation]) : undefined,
    // search: req.query.search? '%' + req.query.search + '%' : undefined,
    order: order? order : 'measured_at',
    dir: dir? dir : 'ASC',
  };

  return Promise.resolve(opts);

}

function addGetQueryParams(sql, opts) {
  // sql = sqlUtils.condAdd(sql, true, ' AND !(Guardian.latitude = 0 AND Guardian.longitude = 0)');
  // sql = sqlUtils.condAdd(sql, true, ' AND !(GuardianAudioEvent.shadow_latitude = 0 AND GuardianAudioEvent.shadow_longitude = 0)');
  // sql = sqlUtils.condAdd(sql, opts.updatedAfter, ' AND GuardianAudioEvent.updated_at > :updatedAfter');
  // sql = sqlUtils.condAdd(sql, opts.updatedBefore, ' AND GuardianAudioEvent.updated_at < :updatedBefore');
  // sql = sqlUtils.condAdd(sql, opts.createdAfter, ' AND GuardianAudioEvent.created_at > :createdAfter');
  // sql = sqlUtils.condAdd(sql, opts.createdBefore, ' AND GuardianAudioEvent.created_at < :createdBefore');
  // sql = sqlUtils.condAdd(sql, opts.startingAfter, ' AND GuardianAudioEvent.begins_at > :startingAfter');
  // sql = sqlUtils.condAdd(sql, opts.endingBefore, ' AND GuardianAudioEvent.ends_at < :endingBefore');
  // sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND GuardianAudioEvent.begins_at > DATE_SUB(:startingAfterLocal, INTERVAL 12 HOUR)');
  // sql = sqlUtils.condAdd(sql, opts.endingBeforeLocal, ' AND GuardianAudioEvent.ends_at < DATE_ADD(:endingBeforeLocal, INTERVAL 14 HOUR)');
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND ev.confidence >= {minimumConfidence}');
  // sql = sqlUtils.condAdd(sql, opts.types, ' AND EventType.value IN (:types)');
  sql = sqlUtils.condAdd(sql, opts.values, ' AND val["w3#label[]"] IN {values}');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND ev.siteGuid IN {sites}');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND ev.guardianGuid IN {guardians}');
  sql = sqlUtils.condAdd(sql, opts.models, ' AND ai.guid IN {models}');
  // sql = sqlUtils.condAdd(sql, opts.excludedGuardians, ' AND Guardian.guid NOT IN (:excludedGuardians)');
  // sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') !== -1, ' AND (Reason.name IN (:reasonsForCreation) OR GuardianAudioEvent.reason_for_creation IS NULL)');
  // sql = sqlUtils.condAdd(sql, opts.reasonsForCreation && opts.reasonsForCreation.indexOf('pgm') === -1, ' AND Reason.name IN (:reasonsForCreation)');
  // sql = sqlUtils.condAdd(sql, !opts.showExperimental, ' AND Model.experimental IS NOT TRUE');
  // sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && !opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT FALSE');
  // sql = sqlUtils.condAdd(sql, opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS TRUE');
  // sql = sqlUtils.condAdd(sql, !opts.omitFalsePositives && opts.omitUnreviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NOT NULL');
  // sql = sqlUtils.condAdd(sql, opts.omitReviewed, ' AND GuardianAudioEvent.reviewer_confirmed IS NULL');
  // sql = sqlUtils.condAdd(sql, opts.search, ' AND (GuardianAudioEvent.guid LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR GuardianAudioEvent.audio_guid LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR Site.guid LIKE :search OR Site.name LIKE :search OR Site.description LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR Guardian.guid LIKE :search OR Guardian.shortname LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR Model.guid LIKE :search OR Model.shortname LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR User.guid LIKE :search OR User.firstname LIKE :search OR User.lastname LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR User.email LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR EventType.value LIKE :search');
  // sql = sqlUtils.condAdd(sql, opts.search, ' OR EventValue.value LIKE :search)');
  return sql;
}

function queryData(req) {

  return prepareOpts(req)
    .then((opts) => {
      console.log('opts', opts);
      let query = `MATCH (ev:event)<-[:contains]-(:eventSet)<-[:has_eventSet]-(ai:ai)-[:classifies]->(val:entity) `;
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1');
      query = addGetQueryParams(query, opts);
      query = sqlUtils.condAdd(query, true, ' RETURN ev');
      console.log('\n\n', query, '\n\n');
      const session = neo4j.session();
      const resultPromise = session.run(query, opts);

      return resultPromise.then(result => {
        session.close();
        return result.records.map((record) => {
          return record.get(0).properties;
        });
      });
    })

}

module.exports = {
  queryData,
};
