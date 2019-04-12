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
    startingAfterLocal: req.query.starting_after_local,
    startingBeforeLocal: req.query.starting_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    minimumConfidence: req.query.minimum_confidence? parseFloat(req.query.minimum_confidence) : undefined,
    values: req.query.values? (Array.isArray(req.query.values)? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites? (Array.isArray(req.query.sites)? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians? (Array.isArray(req.query.guardians)? req.query.guardians : [req.query.guardians]) : undefined,
    models: req.query.models? (Array.isArray(req.query.models)? req.query.models : [req.query.models]) : undefined,
    weekdays: req.query.weekdays !== undefined? (Array.isArray(req.query.weekdays)? req.query.weekdays : [req.query.weekdays]) : undefined,
    order: order? order : 'measured_at',
    dir: dir? dir : 'ASC',
  };

  return Promise.resolve(opts);

}

function addGetQueryParams(sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND ev.audioMeasuredAt > {startingAfterLocal}');
  sql = sqlUtils.condAdd(sql, opts.endingBeforeLocal, ' AND ev.audioMeasuredAt < {endingBeforeLocal}');
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND ev.confidence >= {minimumConfidence}');
  sql = sqlUtils.condAdd(sql, opts.values, ' AND val["w3#label[]"] IN {values}');
  sql = sqlUtils.condAdd(sql, opts.sites, ' AND ev.siteGuid IN {sites}');
  sql = sqlUtils.condAdd(sql, opts.guardians, ' AND ev.guardianGuid IN {guardians}');
  sql = sqlUtils.condAdd(sql, opts.models, ' AND ai.guid IN {models}');
  return sql;
}

function filterWithTz(opts, items) {
  return items.filter((item) => {
    let siteTimezone = item.siteTimezone || 'UTC';
    let measuredAtTz = moment.tz(item.audioMeasuredAt, siteTimezone);
    if (opts.startingAfterLocal) {
      if (measuredAtTz < moment.tz(opts.startingAfterLocal, siteTimezone)) {
        return false;
      }
    }
    if (opts.startingBeforeLocal) {
      if (measuredAtTz > moment.tz(opts.startingBeforeLocal, siteTimezone)) {
        return false;
      }
    }
    if (opts.weekdays) {
      // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if ( !opts.weekdays.includes( `${parseInt(measuredAtTz.format('E')) - 1}` ) ) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (measuredAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false;
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false;
      }
    }
    return true;
  });
}

function queryData(req) {

  return prepareOpts(req)
    .bind({})
    .then((opts) => {
      this.opts = opts;

      let newOpts = Object.assign({}, opts)
      if (newOpts.startingAfterLocal) {
        newOpts.startingAfterLocal = moment.tz(opts.startingAfterLocal, 'UTC').subtract(12, 'hours').valueOf();
      }
      if (newOpts.startingBeforeLocal) {
        newOpts.startingBeforeLocal = moment.tz(opts.startingBeforeLocal, 'UTC').add(14, 'hours').valueOf();
      }

      let query = `MATCH (ev:event)<-[:contains]-(:eventSet)<-[:has_eventSet]-(ai:ai)-[:classifies]->(val:entity) `;
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1');
      query = addGetQueryParams(query, opts);
      query = sqlUtils.condAdd(query, true, ' RETURN ev');

      const session = neo4j.session();
      const resultPromise = session.run(query, newOpts);

      return resultPromise.then(result => {
        session.close();
        return result.records.map((record) => {
          return record.get(0).properties;
        });
      });
    })
    .then((items) => {
      return filterWithTz(this.opts, items);
    });

}

module.exports = {
  queryData,
};
