const Promise = require('bluebird')
const fs = require('fs')
const path = require('path')
const moment = require('moment-timezone')
const { EmptyResultError } = require('../../../../common/error-handling/errors')
const sqlUtils = require('../../../_utils/db/sql-cond-add')
const neo4j = require('../../../_utils/neo4j/neo4j')
const firebaseService = require('../../firebase/firebase-service')
const guardianGroupService = require('../../guardians/guardian-group-service')
const userService = require('../../../../common/users/users-service-legacy')
const textGridService = require('../../textgrid/textgrid-service')
const mailService = require('../../mail/mail-service')
const aws = require('../../../_utils/external/aws.js').aws()
const hash = require('../../../../utils/misc/hash')
const annotationsService = require('../../../../core/_services/annotations')
const classificationService = require('../../../../core/_services/classifications')

function prepareOpts (req) {
  let order, dir
  if (req.query.order) {
    dir = 'ASC'
    if (req.query.dir && ['ASC', 'DESC'].indexOf(req.query.dir.toUpperCase()) !== -1) {
      dir = req.query.dir.toUpperCase()
    }
    switch (req.query.order) {
      case 'measured_at':
        order = 'ev.audioMeasuredAt'
        break
      default:
        order = 'ev.audioMeasuredAt'
        break
    }
  }

  const opts = {
    limit: req.query.limit ? parseInt(req.query.limit) : 10000,
    offset: req.query.offset ? parseInt(req.query.offset) : 0,
    startingAfterLocal: req.query.starting_after_local,
    startingBeforeLocal: req.query.starting_before_local,
    dayTimeLocalAfter: req.query.daytime_local_after,
    dayTimeLocalBefore: req.query.daytime_local_before,
    minimumConfidence: req.query.minimum_confidence ? parseFloat(req.query.minimum_confidence) : undefined,
    values: req.query.values ? (Array.isArray(req.query.values) ? req.query.values : [req.query.values]) : undefined,
    sites: req.query.sites ? (Array.isArray(req.query.sites) ? req.query.sites : [req.query.sites]) : undefined,
    guardians: req.query.guardians ? (Array.isArray(req.query.guardians) ? req.query.guardians : [req.query.guardians]) : undefined,
    models: req.query.models ? (Array.isArray(req.query.models) ? req.query.models : [req.query.models]) : undefined,
    weekdays: req.query.weekdays !== undefined ? (Array.isArray(req.query.weekdays) ? req.query.weekdays : [req.query.weekdays]) : undefined,
    reviewed: req.query.reviewed !== undefined ? (`${req.query.reviewed}` === 'true') : undefined,
    confirmed: req.query.confirmed !== undefined ? (`${req.query.confirmed}` === 'true') : undefined,
    hasNoReviewedWindows: req.query.has_no_reviewed_windows !== undefined ? (`${req.query.has_no_reviewed_windows}` === 'true') : undefined,
    hasConfirmedWindows: req.query.has_confirmed_windows !== undefined ? (`${req.query.has_confirmed_windows}` === 'true') : undefined,
    hasRejectedWindows: req.query.has_rejected_windows !== undefined ? (`${req.query.has_rejected_windows}` === 'true') : undefined,
    isUnreliable: req.query.is_unreliable !== undefined ? (`${req.query.is_unreliable}` === 'true') : undefined,
    guardianGroups: req.query.guardian_groups ? (Array.isArray(req.query.guardian_groups) ? req.query.guardian_groups : [req.query.guardian_groups]) : undefined,
    includeWindows: req.query.include_windows !== undefined ? (`${req.query.include_windows}` === 'true') : undefined,
    order: order || 'ev.audioMeasuredAt',
    dir: dir || 'ASC'
  }

  let availableSiteGuids = []
  return userService.getAllUserSiteGuids(req.rfcx.auth_token_info.guid)
    .then((guids) => {
      availableSiteGuids = guids
      if (opts.sites) {
        opts.sites = opts.sites.filter((site) => {
          return guids.includes(site)
        })
      } else {
        opts.sites = guids
      }

      if (opts.guardianGroups) {
        opts.guardians = opts.guardians || []
        opts.values = opts.values || []
        return guardianGroupService.getGroupsByShortnames(opts.guardianGroups)
          .then((groups) => {
            groups = groups.filter((group) => {
              return group.Site && availableSiteGuids.includes(group.Site.guid)
            })
            groups.forEach((group) => {
              if (!opts.values.length) {
                (group.GuardianAudioEventValues || []).forEach((value) => {
                  if (!opts.values.includes(value.value)) {
                    opts.values.push(value.value)
                  }
                })
              }
              if (!opts.guardians.length) {
                (group.Guardians || []).forEach((guardian) => {
                  if (!opts.guardians.includes(guardian.guid)) {
                    opts.guardians.push(guardian.guid)
                  }
                })
              }
            })
            return Promise.resolve(opts)
          })
      } else {
        return Promise.resolve(opts)
      }
    })
}

function addGetQueryParams (sql, opts) {
  sql = sqlUtils.condAdd(sql, opts.startingAfterLocal, ' AND ev.audioMeasuredAt > {startingAfterLocal}')
  sql = sqlUtils.condAdd(sql, opts.startingBeforeLocal, ' AND ev.audioMeasuredAt < {startingBeforeLocal}')
  sql = sqlUtils.condAdd(sql, opts.minimumConfidence, ' AND ev.confidence >= {minimumConfidence}')
  sql = sqlUtils.condAdd(sql, opts.values !== undefined, ' AND val.value IN {values}')
  sql = sqlUtils.condAdd(sql, opts.sites !== undefined, ' AND ev.siteGuid IN {sites}')
  sql = sqlUtils.condAdd(sql, opts.guardians !== undefined, ' AND ev.guardianGuid IN {guardians}')
  sql = sqlUtils.condAdd(sql, opts.models !== undefined, ' AND ai.guid IN {models}')
  return sql
}

function filterWithTz (opts, rawOpts, items) {
  return items.filter((item) => {
    const siteTimezone = item.siteTimezone || 'UTC'
    const measuredAtTz = moment.tz(item.audioMeasuredAt, siteTimezone)
    if (opts.startingAfterLocal) {
      if (measuredAtTz < moment.tz(rawOpts.startingAfterLocal, siteTimezone)) {
        return false
      }
    }
    if (opts.startingBeforeLocal) {
      if (measuredAtTz > moment.tz(rawOpts.startingBeforeLocal, siteTimezone)) {
        return false
      }
    }
    if (opts.weekdays) {
      // we receive an array like ['0', '1', '2', '3', '4', '5', '6'], where `0` means Monday
      // momentjs by default starts day with Sunday, so we will get ISO weekday
      // (which starts from Monday, but is 1..7) and subtract 1
      if (!opts.weekdays.includes(`${parseInt(measuredAtTz.format('E')) - 1}`)) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalBefore > opts.dayTimeLocalAfter) {
      if (measuredAtTz.format('HH:mm:ss') < opts.dayTimeLocalAfter || measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && opts.dayTimeLocalBefore && opts.dayTimeLocalAfter > opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter && measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    if (opts.dayTimeLocalAfter && !opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') <= opts.dayTimeLocalAfter) {
        return false
      }
    }
    if (!opts.dayTimeLocalAfter && opts.dayTimeLocalBefore) {
      if (measuredAtTz.format('HH:mm:ss') >= opts.dayTimeLocalBefore) {
        return false
      }
    }
    return true
  })
}

function limitAndOffset (opts, items) {
  return items.slice(opts.offset, opts.offset + opts.limit)
}

function queryData (req) {
  let opts, rawOpts

  return prepareOpts(req)
    .then((data) => {
      rawOpts = Object.assign({}, data)
      opts = Object.assign({}, data)
      if (!opts.startingAfterLocal && !opts.startingBeforeLocal) {
        opts.notimezone = true
      }
      if (opts.startingAfterLocal) {
        opts.startingAfterLocal = moment.tz(data.startingAfterLocal, 'UTC').subtract(12, 'hours').valueOf()
      }
      if (opts.startingBeforeLocal) {
        opts.startingBeforeLocal = moment.tz(data.startingBeforeLocal, 'UTC').add(14, 'hours').valueOf()
      }
      if ((!opts.values || !opts.values.length) && (!opts.models || !opts.models.length)) {
        // load only chainsaw-rfcx and vehicle-rfcx if nothing is specified
        opts.models = ['cd9e47d0-ea47-ed6a-be06-3963ecea03bc', '8a9710c2-1056-e169-df6e-68aba3889719']
      }

      let query = 'MATCH (ev:event)<-[:contains]-(evs:eventSet)<-[:has_eventSet]-(ai:ai) '
      query = sqlUtils.condAdd(query, true, ' MATCH (evs)-[:classifies]->(val:label)')
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1')
      query = addGetQueryParams(query, opts)
      query = sqlUtils.condAdd(query, true, ' OPTIONAL MATCH (ev)-[:has_review]->(re:review)<-[:created]->(user:user) WITH ev, evs, ai, val, CASE WHEN COUNT(re) > 0 THEN COLLECT({firstname: user.firstname, lastname: user.lastname, guid: user.guid, email: user.email, pictureUrl: user.pictureUrl, created: re.created, unreliable: re.unreliable, confirmed: re.confirmed, latest: re.latest}) ELSE [] END as re')
      query = sqlUtils.condAdd(query, opts.includeWindows, ' OPTIONAL MATCH (evs)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow) WITH ev, evs, ai, val, aw, re')
      query = sqlUtils.condAdd(query, opts.includeWindows, ' OPTIONAL MATCH (aw:audioWindow)-[:has_review]->(rew:review {latest: true}) WITH ev, evs, ai, val, re, COLLECT({guid: aw.guid, start: aw.start, end: aw.end, confidence: aw.confidence, confirmed: rew.confirmed}) as windows')
      query = sqlUtils.condAdd(query, opts.includeWindows && opts.hasNoReviewedWindows !== undefined || opts.hasConfirmedWindows !== undefined || opts.hasRejectedWindows !== undefined, ' WITH ev, evs, ai, val, windows, re, SIZE(FILTER(window IN windows WHERE window.confirmed = true)) as confirmedCount, SIZE(FILTER(window IN windows WHERE window.confirmed = false)) as rejectedCount') // eslint-disable-line no-mixed-operators
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1')
      query = sqlUtils.condAdd(query, opts.reviewed === true, ' AND SIZE(re) > 0')
      query = sqlUtils.condAdd(query, opts.reviewed === false, ' AND SIZE(re) = 0')
      query = sqlUtils.condAdd(query, opts.confirmed === true, ' AND SIZE(FILTER(r IN re WHERE r.confirmed = true)) > 0')
      query = sqlUtils.condAdd(query, opts.confirmed === false, ' AND SIZE(FILTER(r IN re WHERE r.confirmed = false)) > 0')
      query = sqlUtils.condAdd(query, opts.isUnreliable === true, ' AND SIZE(FILTER(r IN re WHERE r.unreliable = true AND r.latest = true)) > 0')
      query = sqlUtils.condAdd(query, opts.isUnreliable === false, ' AND SIZE(FILTER(r IN re WHERE (NOT EXISTS(r.unreliable) OR r.unreliable = false) AND r.latest = true)) = 0 ')
      query = sqlUtils.condAdd(query, opts.includeWindows && !opts.hasNoReviewedWindows && opts.hasConfirmedWindows === true && opts.hasRejectedWindows === true, ' AND (confirmedCount > 0 OR rejectedCount > 0)')
      query = sqlUtils.condAdd(query, opts.includeWindows && !opts.hasNoReviewedWindows && !opts.hasConfirmedWindows && opts.hasRejectedWindows === true, ' AND rejectedCount > 0')
      query = sqlUtils.condAdd(query, opts.includeWindows && opts.hasNoReviewedWindows === true && !opts.hasConfirmedWindows && opts.hasRejectedWindows === true, ' AND (confirmedCount = 0  AND rejectedCount = 0) OR rejectedCount > 0')
      query = sqlUtils.condAdd(query, opts.includeWindows && opts.hasNoReviewedWindows === true && !opts.hasConfirmedWindows && !opts.hasRejectedWindows, ' AND confirmedCount = 0  AND rejectedCount = 0')
      query = sqlUtils.condAdd(query, opts.includeWindows && opts.hasNoReviewedWindows === true && opts.hasConfirmedWindows === true && !opts.hasRejectedWindows, ' AND (confirmedCount = 0  AND rejectedCount = 0) OR confirmedCount > 0')
      query = sqlUtils.condAdd(query, opts.includeWindows && !opts.hasNoReviewedWindows && !opts.hasConfirmedWindows && opts.hasRejectedWindows === true, ' AND rejectedCount > 0')
      query = sqlUtils.condAdd(query, opts.includeWindows && !opts.hasNoReviewedWindows && opts.hasConfirmedWindows === true && !opts.hasRejectedWindows, ' AND confirmedCount > 0')
      query = sqlUtils.condAdd(query, opts.includeWindows, ' RETURN ev, ai, val.value as value, val.label as label, re as review, windows')
      query = sqlUtils.condAdd(query, !opts.includeWindows, ' RETURN ev, ai, val.value as value, val.label as label, re as review')
      query = sqlUtils.condAdd(query, true, ` ORDER BY ${opts.order} ${opts.dir}`)
      query = sqlUtils.condAdd(query, opts.notimezone, ` SKIP ${opts.offset} LIMIT ${opts.limit}`)

      const session = neo4j.session()
      const resultPromise = session.run(query, opts)

      return resultPromise.then(result => {
        session.close()
        return result.records.map((record) => {
          const event = record.get(0).properties
          const ai = record.get(1).properties
          event.aiName = ai.name
          event.aiGuid = ai.guid
          event.aiMinConfidence = ai.minConfidence
          const assetUrlBase = `${process.env.ASSET_URLBASE}/audio/${event.audioGuid}`
          event.urls = {
            mp3: `${assetUrlBase}.mp3`,
            png: `${assetUrlBase}.png`,
            opus: `${assetUrlBase}.opus`
          }
          event.value = record.get(2)
          event.label = record.get(3)

          const reviews = record.get(4)
          event.confirmed = reviews.filter((review) => review.confirmed === true).length
          event.rejected = reviews.filter((review) => review.confirmed === false).length
          if (!reviews.length) {
            event.last_review = null
          } else {
            const lastReview = reviews.find((review) => review.latest === true)
            event.last_review = lastReview || reviews[reviews.length - 1]
          }

          if (opts.includeWindows) {
            const windows = record.get(5)
            event.windows = windows
          }
          return event
        })
      })
    })
    .then((items) => {
      return opts.notimezone ? items : filterWithTz(opts, rawOpts, items)
    })
    .then((items) => {
      const result = {
        events: opts.notimezone ? items : limitAndOffset(opts, items)
      }
      if (!opts.notimezone) {
        result.total = items.length
      }
      return result
    })
    .then((data) => {
      rawOpts = null
      opts = null
      return data
    })
}

function getEventByGuid (guid) {
  const query = 'MATCH (ev:event {guid: {guid}})<-[:contains]-(evs:eventSet)<-[:has_eventSet]-(ai:ai) ' +
    'MATCH (evs)-[:classifies]->(lb:label) ' +
    'OPTIONAL MATCH (evs)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow) ' +
    'WITH ev, evs, ai, lb, aw ' +
    'OPTIONAL MATCH (aw:audioWindow)-[:has_review]->(rew:review {latest: true}) ' +
    'WITH ev, evs, ai, lb, COLLECT({guid: aw.guid, start: aw.start, end: aw.end, confidence: aw.confidence, confirmed: rew.confirmed}) as windows ' +
    'OPTIONAL MATCH (ev)-[:has_review]->(re:review)<-[:created]->(user:user) ' +
    'WITH ev, evs, ai, lb, windows, CASE WHEN COUNT(re) > 0 THEN COLLECT({firstname: user.firstname, lastname: user.lastname, guid: user.guid, email: user.email, pictureUrl: user.pictureUrl, created: re.created, unreliable: re.unreliable, confirmed: re.confirmed, latest: re.latest}) ELSE [] END as re ' +
    'RETURN ev as event, ai as ai, lb.value as value, lb.label as label, windows, re as review '

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, { guid }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      const event = record.get(0).properties
      const ai = record.get(1).properties
      event.aiName = ai.name
      event.aiGuid = ai.guid
      event.aiMinConfidence = ai.minConfidence
      const assetUrlBase = `${process.env.ASSET_URLBASE}/audio/${event.audioGuid}`
      event.urls = {
        mp3: `${assetUrlBase}.mp3`,
        png: `${assetUrlBase}.png`,
        opus: `${assetUrlBase}.opus`
      }
      event.value = record.get(2)
      event.label = record.get(3)
      const windows = record.get(4)
      event.windows = windows

      const reviews = record.get(5)
      event.confirmed = reviews.filter((review) => review.confirmed === true).length
      event.rejected = reviews.filter((review) => review.confirmed === false).length
      if (!reviews.length) {
        event.last_review = null
      } else {
        const lastReview = reviews.find((review) => review.latest === true)
        event.last_review = lastReview || reviews[reviews.length - 1]
      }
      return event
    })[0]
  })
}

function queryReviews (req) {
  let opts, rawOpts

  return prepareOpts(req)
    .then((data) => {
      rawOpts = Object.assign({}, data)
      opts = Object.assign({}, data)
      if (opts.startingAfterLocal) {
        opts.startingAfterLocal = moment.tz(data.startingAfterLocal, 'UTC').subtract(12, 'hours').valueOf()
      }
      if (opts.startingBeforeLocal) {
        opts.startingBeforeLocal = moment.tz(data.startingBeforeLocal, 'UTC').add(14, 'hours').valueOf()
      }

      let query = 'MATCH (ev:event)<-[:contains]-(evs:eventSet)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow)-[:has_review]->(re:review) '
      query = sqlUtils.condAdd(query, true, ' MATCH (val:label)<-[:classifies]-(evs)<-[:has_eventSet]-(ai:ai)')
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1')
      query = sqlUtils.condAdd(query, true, ' AND (NOT EXISTS(re.unreliable) OR re.unreliable = false)')
      query = sqlUtils.condAdd(query, opts.startingAfterLocal, ' AND ev.audioMeasuredAt > {startingAfterLocal}')
      query = sqlUtils.condAdd(query, opts.startingBeforeLocal, ' AND ev.audioMeasuredAt < {startingBeforeLocal}')
      query = sqlUtils.condAdd(query, opts.values, ' AND val.value IN {values}')
      query = sqlUtils.condAdd(query, opts.sites, ' AND ev.siteGuid IN {sites}')
      query = sqlUtils.condAdd(query, opts.guardians, ' AND ev.guardianGuid IN {guardians}')
      query = sqlUtils.condAdd(query, opts.models, ' AND ai.guid IN {models}')
      query = sqlUtils.condAdd(query, true, ' RETURN ev, val.value as value, val.label as label, COLLECT({start: aw.start, end: aw.end, confirmed: re.confirmed}) as reviewData')
      query = sqlUtils.condAdd(query, true, ` ORDER BY ${opts.order} ${opts.dir}`)

      const session = neo4j.session()
      const resultPromise = session.run(query, opts)

      return resultPromise.then(result => {
        session.close()
        return result.records.map((record) => {
          const event = record.get(0).properties
          event.value = record.get(1)
          event.label = record.get(2)
          event.audioWindows = record.get(3)
          return event
        })
      })
    })
    .then((items) => {
      return filterWithTz(opts, rawOpts, items)
    })
    .then((items) => {
      rawOpts = null
      opts = null
      return items
    })
}

function getAiModelsForReviews (req) {
  let opts, rawOpts

  return prepareOpts(req)
    .then((data) => {
      rawOpts = Object.assign({}, data)
      opts = Object.assign({}, data)

      if (opts.startingAfterLocal) {
        opts.startingAfterLocal = moment.tz(data.startingAfterLocal, 'UTC').subtract(12, 'hours').valueOf()
      }
      if (opts.startingBeforeLocal) {
        opts.startingBeforeLocal = moment.tz(data.startingBeforeLocal, 'UTC').add(14, 'hours').valueOf()
      }

      let query = 'MATCH (ev:event)<-[:contains]-(evs:eventSet)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow)-[:has_review]->(re:review) '
      query = sqlUtils.condAdd(query, true, ' MATCH (evs)<-[:has_eventSet]-(ai:ai {public: true})')
      query = sqlUtils.condAdd(query, true, ' WHERE 1=1')
      query = sqlUtils.condAdd(query, true, ' AND (NOT EXISTS(re.unreliable) OR re.unreliable = false)')
      query = sqlUtils.condAdd(query, opts.guardians, ' AND ev.guardianGuid IN {guardians}')
      query = sqlUtils.condAdd(query, opts.startingAfterLocal, ' AND ev.audioMeasuredAt > {startingAfterLocal}')
      query = sqlUtils.condAdd(query, opts.startingBeforeLocal, ' AND ev.audioMeasuredAt < {startingBeforeLocal}')
      query = sqlUtils.condAdd(query, true, ' RETURN DISTINCT ai')

      const session = neo4j.session()
      const resultPromise = session.run(query, opts)

      return resultPromise.then(result => {
        session.close()
        if (!result.records || !result.records.length) {
          throw new EmptyResultError('AI models not found.')
        }
        return result.records.map((record) => {
          return record.get(0).properties
        })
      })
    })
    .then((items) => {
      return filterWithTz(opts, rawOpts, items)
    })
    .then((items) => {
      rawOpts = null
      opts = null
      return items
    })
}

function queryWindowsForEvent (eventGuid) {
  const query = 'MATCH (ev:event {guid: {eventGuid}})<-[:contains]-(:eventSet)-[:relates_to]->(:audioWindowSet)-[:contains]->(aw:audioWindow) ' +
    'OPTIONAL MATCH (aw)-[:has_review]->(re:review) WHERE re.latest = true ' +
    'RETURN aw, re.confirmed as confirmed ORDER BY aw.start'

  const session = neo4j.session()
  const resultPromise = session.run(query, { eventGuid })

  return resultPromise.then(result => {
    session.close()
    return result.records.map((record) => {
      const obj = record.get(0).properties
      obj.confirmed = record.get(1)
      return obj
    })
  })
}

function getEventInfoByGuid (eventGuid) {
  const query = 'MATCH (ev:event {guid: {eventGuid}})<-[:contains]-(evs:eventSet)<-[:has_eventSet]-(ai:ai) ' +
    'MATCH (evs)-[:classifies]->(lb:label) ' +
    'RETURN ev as event, ai as ai, lb as label'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, { eventGuid }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      return {
        event: record.get(0).properties,
        ai: record.get(1).properties,
        label: record.get(2).properties
      }
    })[0]
  })
}

function sendNotificationsForEvent (data) {
  if (data.ignore_time || moment.tz('UTC').diff(moment.tz(data.measured_at, 'UTC'), 'hours') < 2) {
    return guardianGroupService.getAllGroupsForGuardianId(data.guardian_id)
      .then((dbGuardianGroups) => {
        dbGuardianGroups.forEach((dbGuardianGroup) => {
          // send notiication only if guardian group allows this value of notification
          if (dbGuardianGroup.GuardianAudioEventValues && dbGuardianGroup.GuardianAudioEventValues.find((dbEventValue) => { return dbEventValue.value === data.value })) {
            const opts = {
              app: 'rangerApp',
              topic: `guardiangroup-${dbGuardianGroup.shortname}`,
              data: {
                type: data.type || 'alert',
                value: data.value,
                event_guid: data.event_guid,
                audio_guid: data.audio_guid,
                latitude: `${data.latitude}`,
                longitude: `${data.longitude}`,
                guardian_guid: data.guardian_guid,
                guardian_shortname: data.guardian_shortname,
                site_guid: data.site_guid,
                ai_guid: data.ai_guid
              },
              title: 'Rainforest Connection',
              body: `A ${data.value} detected from ${data.guardian_shortname}`
            }
            // Send push notification to mobile devices
            firebaseService.sendToTopic(opts)
              .catch((err) => {
                console.error(`Error sending Firebase message for audio ${data.audio_guid} to ${dbGuardianGroup.shortname} topic`, err)
              })
            // Send email to subscribers
            dbGuardianGroup.getUsers()
              .then((dbUsers) => {
                if (!dbUsers || !dbUsers.length) {
                  return true
                }
                return mailService.getDetectionAlertHtml()
                  .then((html) => {
                    const time = moment.tz(data.measured_at, data.site_timezone)
                    return mailService.sendEmail({
                      from_email: 'noreply@rfcx.org',
                      from_name: 'Rainforest Connection',
                      merge_language: 'handlebars',
                      to: dbUsers.map((dbUser) => {
                        return {
                          email: dbUser.subscription_email || dbUser.email,
                          name: dbUser.firstname || null,
                          type: 'to'
                        }
                      }),
                      global_merge_vars: [
                        { name: 'time', content: time.format('YYYY-MM-DD HH:mm:ss') },
                        { name: 'site_timezone', content: data.site_timezone },
                        { name: 'latitude', content: data.latitude },
                        { name: 'longitude', content: data.longitude },
                        { name: 'event_guid', content: data.event_guid }
                      ],
                      // recipient-oriented template vars
                      // we will use it to generate safe unsubscribe url for each user
                      merge_vars: dbUsers.map((dbUser) => {
                        const email = dbUser.subscription_email || dbUser.email
                        return {
                          rcpt: email,
                          vars: [
                            {
                              name: 'unsubscribe_url',
                              content: `${process.env.REST_PROTOCOL}://${process.env.REST_HOST}/v1/guardians/groups/unsubscribe/public?groups[]=${dbGuardianGroup.shortname}&email=${email}&token=${hash.hashedCredentials(userService.unsubscriptionSalt, email)}`
                            }
                          ]
                        }
                      }),
                      subject: `A ${data.value} detected on ${data.guardian_shortname} at ${time.format('HH:mm:ss YYYY-MM-DD')}`,
                      html
                    })
                  })
              })
          }
        })
      })
  }
}

function sendSNSForEvent (data) {
  if (moment.tz('UTC').diff(moment.tz(data.measured_at, 'UTC'), 'hours') < 2) {
    const msg = {
      type: data.type || 'alert',
      detected: data.value,
      guardian: data.guardian_shortname,
      model: data.ai_name,
      audio_guid: data.audio_guid,
      listen: `${process.env.ASSET_URLBASE}/audio/${data.audio_guid}.mp3?inline=true`
    }

    const topic = `rfcx-detection-alerts-${data.site_guid}`
    aws.createTopic(topic)
      .then((data) => {
        return aws.publish(topic, msg)
      })
      .catch((err) => {
        console.error(`Error sending SNS message for audio ${data.audio_guid} to ${topic} topic`, err)
      })
  }
}

function clearPreviousReviewOfUser (guid, user) {
  const query = 'MATCH (ev:event {guid: {guid}}) ' +
    'OPTIONAL MATCH (user:user {guid: {userGuid}, email: {userEmail}}) ' +
    'OPTIONAL MATCH (ev)-[:has_review]->(re:review)<-[:created]-(user) ' +
    'DETACH DELETE re ' +
    'RETURN ev as event'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, {
    guid,
    userGuid: user.guid,
    userEmail: user.email
  }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      return record.get(0).properties
    })
  })
}

function clearLatestReview (guid) {
  const query = 'MATCH (ev:event {guid: {guid}}) ' +
    'OPTIONAL MATCH (ev)-[has_review]->(re:review { latest: true }) ' +
    'SET re.latest = null ' +
    'RETURN ev as event'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, { guid }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      return record.get(0).properties
    })
  })
}

function createEvent (event) {
  const createdAt = Date.now()
  const eventUuid = event.id
  const classificationValue = event.classification.value
  const measuredAt = moment(event.start).valueOf()
  const latitude = event.stream.latitude
  const longitude = event.stream.longitude
  const streamId = event.stream.id
  const streamName = event.stream.name

  // TODO: Unable to determine these values from timescale
  const aiGuid = '843cb81d-03b9-07e1-5184-931c95265213'
  const site = 'tembe'
  const siteTimezone = 'America/Belem'

  const query = `MATCH (ai:ai {guid: {aiGuid} })-[:classifies]->(lb:label {value: {classificationValue}})
    MERGE (ai)-[:has_audioWindowSet]-(aws:audioWindowSet {createdAt: {createdAt}})-[:classifies]->(lb)
    MERGE (ai)-[:has_eventSet]-(evs:eventSet {createdAt: {createdAt}})-[:classifies]->(lb)
    CREATE (ev:event {guid: {eventUuid}, audioMeasuredAt: {measuredAt}, audioGuid: '',
       latitude: {latitude}, longitude: {longitude},
       guardianGuid: {streamId}, guardianShortname: {streamName},
       siteGuid: {site}, siteTimezone: {siteTimezone}, createdAt: {createdAt}})
    MERGE (evs)-[:contains]->(ev) MERGE (evs)-[:relates_to]->(aws)
    RETURN ev as event, aws as audio_window_set`

  const params = { eventUuid, measuredAt, createdAt, aiGuid, classificationValue, streamId, streamName, latitude, longitude, site, siteTimezone }

  const session = neo4j.session()
  const result = session.run(query, params)
  session.close()

  if (!result.records || !result.records.length) {
    throw new EmptyResultError(`Failed to create audio windows in Neo4j. Missing label "${classificationValue}"?`)
  }

  return eventUuid
}

function reviewEvent (guid, confirmed, user, timestamp, unreliable) {
  const query = 'MATCH (ev:event {guid: {guid}})<-[:contains]-(evs:eventSet)-[:classifies]->(val:label), (user:user {guid: {userGuid}, email: {userEmail}})' +
    'MERGE (ev)-[:has_review]->(:review { latest: true, confirmed: {confirmed}, created: {timestamp}, unreliable: {unreliable} })<-[:created]-(user) ' +
    'RETURN ev as event, val.value as value'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, {
    guid,
    confirmed,
    userGuid: user.guid,
    userEmail: user.email,
    timestamp,
    unreliable
  }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      const event = record.get(0).properties
      event.value = record.get(1)
      return event
    })[0]
  })
}

function clearPreviousAudioWindowsReviewOfUser (guid, user) {
  const query = 'MATCH (ev:event {guid: {guid}})<-[:contains]-(evs:eventSet)-[:relates_to]->(aws:audioWindowSet) ' +
    'OPTIONAL MATCH (user:user {guid: {userGuid}, email: {userEmail}}) ' +
    'OPTIONAL MATCH (aws)-[:contains]->(aw:audioWindow)-[:has_review]->(re:review)<-[:created]-(user) ' +
    'DETACH DELETE re ' +
    'RETURN ev as event'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, {
    guid,
    userGuid: user.guid,
    userEmail: user.email
  }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      return record.get(0).properties
    })
  })
}

function clearLatestAudioWindowsReview (guid) {
  const query = 'MATCH (ev:event {guid: {guid}})<-[:contains]-(evs:eventSet)-[:relates_to]->(aws:audioWindowSet)-[:contains]->(aw:audioWindow)' +
    'OPTIONAL MATCH (aw)-[:has_review]->(re:review) ' +
    'SET re.latest = null ' +
    'RETURN ev as event'

  const session = neo4j.session()
  const resultPromise = Promise.resolve(session.run(query, { guid }))

  return resultPromise.then(result => {
    session.close()
    if (!result.records || !result.records.length) {
      throw new EmptyResultError('Event with given guid not found.')
    }
    return result.records.map((record) => {
      return record.get(0).properties
    })
  })
}

function reviewAudioWindows (windowsData, user, timestamp, unreliable) {
  const session = neo4j.session()
  const proms = []
  windowsData.forEach((item) => {
    const query = 'MATCH (aw:audioWindow {guid: {guid}}) ' +
      'MATCH (user:user {guid: {userGuid}, email: {userEmail}}) ' +
      'MERGE (aw)-[:has_review]->(:review {latest: true, confirmed: {confirmed}, created: {timestamp}, unreliable: {unreliable} })<-[:created]-(user) ' +
      'RETURN aw as audioWindow'

    const resultPromise = Promise.resolve(session.run(query, {
      guid: item.guid,
      confirmed: item.confirmed,
      userGuid: user.guid,
      userEmail: user.email,
      timestamp,
      unreliable
    }))
    proms.push(resultPromise)
  })
  return Promise.all(proms)
    .then((promData) => {
      session.close()
      return promData.map((item) => {
        return item.records.map((record) => {
          return record.get(0).properties
        })[0]
      })
    })
}

function generateTextGridContent (tempPath, reviews) {
  const proms = []
  reviews.forEach((item, i) => {
    item.xmin_global = 0
    item.xmax_global = 90
    item.size = 1
    const filePath = path.join(tempPath, `${item.audioGuid}.textgrid`)
    const textGridStr = textGridService.prepareTextGrid(item)
    const prom = new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath)
      stream.once('open', function (fd) {
        stream.write(textGridStr)
        stream.end()
        stream.on('finish', () => { resolve(filePath) })
        stream.on('error', reject)
      })
    })
    proms.push(prom)
  })
  return Promise.all(proms)
}

function formatReviewsForFiles (reviews) {
  return reviews.map((review) => {
    return {
      name: `${review.audioGuid}.json`,
      content: JSON.stringify({
        audioGuid: review.audioGuid,
        windows: review.audioWindows.map((window) => {
          return {
            xmin: window.start / 1000,
            xmax: window.end / 1000,
            label: review.label,
            type: window.confirmed !== undefined ? window.confirmed === true : null
          }
        })
      }, null, 4)
    }
  })
}

function formatEventAsTags (event, type) {
  let tags
  const audioStart = moment.tz(event.audioMeasuredAt, event.siteTimezone).toISOString()
  if (type === 'inference') {
    tags = event.windows.map((window) => { return formatWindowFromEvent(window, audioStart, event, type) })
  } else {
    tags = event.windows
      .filter((window) => {
        return window.confirmed === (type === 'inference:confirmed')
      })
      .map((window) => { return formatWindowFromEvent(window, audioStart, event, type) })
  }

  return tags
}

function formatWindowFromEvent (window, audioStart, event, type) {
  return {
    start: audioStart,
    label: event.value,
    type: type,
    legacy: {
      audioGuid: event.audioGuid,
      guardianGuid: event.guardianGuid,
      xmin: window.start,
      xmax: window.end,
      confidence: window.confidence
    }
  }
}

function formatEventsAsTags (events, type) {
  return events.map((event) => formatEventAsTags(event, type))
    .reduce((prev, cur) => { return prev.concat(cur) }, [])
}

async function saveInTimescaleDB (event, windows, confirmations, userId) {
  try {
    const confObj = confirmations.reduce((acc, conf) => {
      acc[conf.guid] = conf.confirmed
      return acc
    }, {})
    const classificationId = await classificationService.getId(event.value)
    for (const w of windows) {
      await annotationsService.create({
        streamId: event.guardianGuid,
        start: event.audioMeasuredAt + w.start,
        end: event.audioMeasuredAt + w.end,
        classificationId,
        frequencyMin: null,
        frequencyMax: null,
        userId,
        isManual: false,
        isPositive: confObj[w.guid]
      })
    }
  } catch (e) {
    console.error('Failed sync between Neo4j and TimescaleDB reviews', e)
  }
}

module.exports = {
  queryData,
  queryWindowsForEvent,
  queryReviews,
  getEventInfoByGuid,
  sendNotificationsForEvent,
  sendSNSForEvent,
  clearPreviousReviewOfUser,
  clearPreviousAudioWindowsReviewOfUser,
  clearLatestReview,
  clearLatestAudioWindowsReview,
  createEvent,
  reviewEvent,
  reviewAudioWindows,
  generateTextGridContent,
  formatReviewsForFiles,
  formatEventsAsTags,
  getAiModelsForReviews,
  getEventByGuid,
  saveInTimescaleDB
}
