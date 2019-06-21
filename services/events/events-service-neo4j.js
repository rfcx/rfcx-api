var Promise = require("bluebird");
const moment = require("moment-timezone");
var ValidationError = require('../../utils/converter/validation-error');
var EmptyResultError = require('../../utils/converter/empty-result-error');
var sqlUtils = require("../../utils/misc/sql");
const neo4j = require('../../utils/neo4j');
const firebaseService = require('../firebase/firebase-service');
const guardianGroupService = require('../guardians/guardian-group-service');
const loggers  = require('../../utils/logger');
const logError = loggers.errorLogger.log;
const aws = require("../../utils/external/aws.js").aws();

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
    order: order? order : 'ev.audioMeasuredAt',
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

function limitAndOffset(opts, items) {
  return items.slice(opts.offset, opts.offset + opts.limit);
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
      query = sqlUtils.condAdd(query, true, ' RETURN ev, ai, val["w3#label[]"] as label, val.rfcxLabel as publicLabel');
      query = sqlUtils.condAdd(query, true, ` ORDER BY ${opts.order} ${opts.dir}`);

      const session = neo4j.session();
      const resultPromise = session.run(query, newOpts);

      return resultPromise.then(result => {
        session.close();
        return result.records.map((record) => {
          let event = record.get(0).properties;
          let ai = record.get(1).properties;
          event.aiName = ai.name;
          event.aiGuid = ai.guid;
          let assetUrlBase = `${process.env.ASSET_URLBASE}/audio/${event.audioGuid}`;
          event.urls = {
            mp3: `${assetUrlBase}.mp3`,
            png: `${assetUrlBase}.png`,
            opus: `${assetUrlBase}.opus`
          },
          event.value = record.get(2);
          event.label = record.get(3);
          return event;
        });
      });
    })
    .then((items) => {
      return filterWithTz(this.opts, items);
    })
    .then((items) => {
      return {
        total: items.length,
        events: limitAndOffset(this.opts, items)
      };
    })

}

function queryWindowsForEvent(eventGuid) {

  let query = `MATCH (ev:event {guid: {eventGuid}})<-[:contains]-(:eventSet)<-[:has_eventSet]-(ai:ai) ` +
              `MATCH (ai)-[:has_audioWindowSet]->(:audioWindowSet {audioGuid: ev.audioGuid})-[:contains]->(aw:audioWindow) ` +
              `RETURN aw ORDER BY aw.start`;

  const session = neo4j.session();
  const resultPromise = session.run(query, { eventGuid });

  return resultPromise.then(result => {
    session.close();
    return result.records.map((record) => {
      return record.get(0).properties;
    });
  });

}

function getEventInfoByGuid(eventGuid) {

  let query = `MATCH (ev:event {guid: {eventGuid}})<-[:contains]-(:eventSet)<-[:has_eventSet]-(ai:ai) ` +
              `MATCH (ai)-[:classifies]->(en:entity) ` +
              `RETURN ev as event, ai as ai, en as entity`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, { eventGuid }));

  return resultPromise.then(result => {
    session.close();
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.');
    }
    return result.records.map((record) => {
      return {
        event: record.get(0).properties,
        ai: record.get(1).properties,
        entity: record.get(2).properties,
      };
    })[0];
  });

}

function sendPushNotificationsForEvent(data) {
  if (moment.tz('UTC').diff(moment.tz(data.measured_at, 'UTC'), 'hours') < 2) {
    return guardianGroupService.getAllGroupsForGuardianId(data.guardian_id)
      .then((dbGuardianGroups) => {
        dbGuardianGroups.forEach((dbGuardianGroup) => {
          // send notiication only if guardian group allows this value of notification
          if (dbGuardianGroup.GuardianAudioEventValues && dbGuardianGroup.GuardianAudioEventValues.find((dbEventValue) => { return dbEventValue.value === data.value; })) {
            let opts = {
              app: 'rangerApp',
              topic: dbGuardianGroup.shortname,
              data: {
                type: data.type || 'alert',
                value: data.value,
                audio_guid: data.audio_guid,
                latitude: `${data.latitude}`,
                longitude: `${data.longitude}`,
                guardian_guid: data.guardian_guid,
                site_guid: data.site_guid,
                ai_guid: data.ai_guid,
              },
              title: `Rainforest Connection`,
              body: `A ${data.value} detected from ${data.guardian_shortname}`
            };
            firebaseService.sendToTopic(opts)
              .catch((err) => {
                logError(`Error sending Firebase message for audio ${data.audio_guid} to ${dbGuardianGroup.shortname} topic`, { req, err });
              });
          }
        });
      });
  }
}

function sendSNSForEvent(data) {
  if (moment.tz('UTC').diff(moment.tz(data.measured_at, 'UTC'), 'hours') < 2) {
    var msg = {
      type: data.type || 'alert',
      detected: data.value,
      guardian: data.guardian_shortname,
      model: data.ai_name,
      audio_guid: data.audio_guid,
      listen: `${process.env.ASSET_URLBASE}/audio/${data.audio_guid}.mp3?inline=true`
    };

    let topic = `rfcx-detection-alerts-${data.site_guid}`;
    aws.createTopic(topic)
      .then((data) => {
        return aws.publish(topic, msg);
      })
      .catch((err) => {
        logError(`Error sending SNS message for audio ${data.audio_guid} to ${topic} topic`, { req, err });
      });
  }
}

function clearEventReview(guid, user) {

  let query = 'MATCH (ev:event {guid: {guid}}) ' +
              'OPTIONAL MATCH (ev)-[:has_review]->(re:review)<-[:created]-(:user { guid: {userGuid}, email: {userEmail} }) ' +
              'DETACH DELETE re ' +
              'RETURN ev as event';

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, { guid, userGuid: user.guid, userEmail: user.email }));

  return resultPromise.then(result => {
    session.close();
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.');
    }
    return result.records.map((record) => {
      return record.get(0).properties;
    });
  });

}

function reviewEvent(guid, confirmed, user) {

  let query = `MATCH (ev:event {guid: {guid}}), (user:user {guid: {userGuid}, email: {userEmail}})` +
              `MERGE (ev)-[:has_review]->(:review {confirmed: {confirmed}})<-[:created]-(user) ` +
              `RETURN ev as event`;

  const session = neo4j.session();
  const resultPromise = Promise.resolve(session.run(query, {
    guid,
    confirmed,
    userGuid: user.guid,
    userEmail: user.email,
  }));

  return resultPromise.then(result => {
    session.close();
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.');
    }
    return result.records.map((record) => {
      return record.get(0).properties;
    });
  });

}

function clearAudioWindowsReview(windowsData, user) {
  const session = neo4j.session();
  let proms = [];
  windowsData.forEach((item) => {
    let query = 'MATCH (aw:audioWindow {guid: {guid}}) ' +
                'OPTIONAL MATCH (aw)-[:has_review]->(re:review)<-[:created]-(:user { guid: {userGuid}, email: {userEmail} }) ' +
                'DETACH DELETE re ' +
                'RETURN aw as audioWindow';
    let resultPromise = Promise.resolve(session.run(query, { guid: item.guid, userGuid: user.guid, userEmail: user.email }));
    proms.push(resultPromise);
  });
  return Promise.all(proms)
    .then(() => {
      session.close();
      return true;
    });
}

function reviewAudioWindows(windowsData, user) {
  const session = neo4j.session();
  let proms = [];
  windowsData.forEach((item) => {
    let query = `MATCH (aw:audioWindow {guid: {guid}}) ` +
                `MATCH (user:user {guid: {userGuid}, email: {userEmail}}) ` +
                `MERGE (aw)-[:has_review]->(:review {confirmed: {confirmed}})<-[:created]-(user) ` +
                `RETURN aw as audioWindow`;

    let resultPromise = Promise.resolve(session.run(query, {
      guid: item.guid,
      confirmed: item.confirmed,
      userGuid: user.guid,
      userEmail: user.email,
    }));
    proms.push(resultPromise);
  });
  return Promise.all(proms)
    .then(() => {
      session.close();
      return true;
    });
}

module.exports = {
  queryData,
  queryWindowsForEvent,
  getEventInfoByGuid,
  sendPushNotificationsForEvent,
  sendSNSForEvent,
  clearEventReview,
  reviewEvent,
  reviewAudioWindows,
  clearAudioWindowsReview,
};
