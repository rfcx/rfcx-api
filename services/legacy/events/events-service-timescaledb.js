const moment = require('moment')
const userService = require('../../users/users-service-legacy')
const guardianGroupService = require('../../guardians/guardian-group-service')
const { Classification, Event, Sequelize, Stream, Project } = require('../../../modelsTimescale')
const { mapClassifications } = require('../classifications')
const { getStreamRangeToken } = require('../../streams')
const { ISOToGluedDateStr } = require('../../../utils/misc/datetime')
const pagedQuery = require('../../../utils/db/paged-query')
const MEDIA_API_BASE_URL = process.env.MEDIA_API_BASE_URL

const streamInclude = Stream.include({ attributes: ['id', 'name', 'latitude', 'longitude'] })
streamInclude.include = [Project.include({ attributes: ['id', 'name'], required: false })]

const include = [
  streamInclude,
  Classification.include({ attributes: ['value', 'title'] })
]

async function parseParams (params, user) {
  const { streamIds, classificationValues } = await parseStreamsAndClassifications(params, user)
  const filters = {
    start: moment().subtract(1, 'month'),
    end: moment(),
    streamIds,
    classificationValues
  }
  const options = {
    readableBy: undefined, // set to undefined because old permissions logic does not match new permissions logic
    limit: params.limit,
    offset: params.offset,
    descending: params.dir === 'DESC',
    fields: ['id', 'stream_id', 'start', 'end', 'created_at']
  }
  return { filters, options }
}

async function getGuardianGroups (params, user) {
  // get GuardianSite guids which user has access to
  const dbUser = await userService.getUserByGuid(user.guid)
  const userGuardianSiteGuids = await userService.getAllUserSiteGuids(dbUser)
  // get requested guardian groups
  let groups = await guardianGroupService.getGroupsByShortnames(params.guardianGroups)
  // filter guardian groups by user access
  groups = groups.filter(g => g.Site && userGuardianSiteGuids.includes(g.Site.guid))
  return groups
}

async function parseStreamsAndClassifications (params, user) {
  let streamIds
  let classificationValues
  if (params.guardians) {
    streamIds = params.guardians
  }
  if (params.values) {
    classificationValues = mapClassifications(params.values)
  }
  if (params.guardianGroups) {
    const groups = await getGuardianGroups(params, user)
    const groupsGuardians = groups.map((group) => {
      return group.Guardians.map(guardian => guardian.guid)
    }).flat()
    const groupsClassifications = groups.map((group) => {
      return group.GuardianAudioEventValues.map(eventValue => eventValue.value)
    }).flat()
    streamIds = [...new Set([...(streamIds || []), ...groupsGuardians])]
    classificationValues = [...new Set([...(classificationValues || []), ...groupsClassifications])]
  }
  return {
    streamIds,
    classificationValues
  }
}

function getAssetUrl (event, format) {
  const startStr = ISOToGluedDateStr(event.start.toISOString())
  const endStr = ISOToGluedDateStr(event.demoAbleEnd.toISOString())
  const base = `${MEDIA_API_BASE_URL}internal/assets/streams/${event.stream_id}_t${startStr}.${endStr}`
  const streamToken = getStreamRangeToken(event.stream_id, event.start.valueOf(), event.demoAbleEnd.valueOf())
  let url
  if (format === 'png') {
    url = `${base}_z95_wdolph_g1_fspec_d1269.196.png`
  } else {
    url = `${base}_f${format}.${format}`
  }
  url += `?stream-token=${streamToken}`
  return url
}

function format (event) {
  const startTimestamp = event.start.valueOf()
  const endTimestamp = event.end.valueOf()
  const demoAbleEndTimestamp = endTimestamp - startTimestamp > 60000 ? startTimestamp + 60000 : endTimestamp
  event.demoAbleEnd = moment.utc(demoAbleEndTimestamp)
  return {
    guid: event.id,
    audioGuid: event.id, // we don't have any audio guids in the new structure
    urls: {
      mp3: getAssetUrl(event, 'mp3'),
      opus: getAssetUrl(event, 'opus'),
      png: getAssetUrl(event, 'png')
    },
    createdAt: new Date(event.created_at).valueOf(),
    guardianShortname: event.stream.name,
    latitude: event.stream.latitude,
    longitude: event.stream.longitude,
    siteGuid: event.stream.project ? event.stream.project.id : `stream_${event.stream.id}`,
    audioMeasuredAt: startTimestamp,
    guardianGuid: event.stream.id,
    audioDuration: demoAbleEndTimestamp - startTimestamp,
    value: event.classification.value,
    label: event.classification.title,
    confirmed: 0,
    rejected: 0,
    last_review: null,
    siteTimezone: null, // Probably unused
    confidence: 1, // Probably unused
    aiName: null, // Probably unused
    aiGuid: null, // Probably unused,
    aiMinConfidence: null // Probably unused
  }
}

async function query (params, user) {
  const { filters, options } = await parseParams(params, user)
  const attributes = options.fields && options.fields.length > 0 ? Event.attributes.full.filter(a => options.fields.includes(a)) : Event.attributes.lite

  if ((filters.streamIds && !filters.streamIds.length) || (filters.classificationValues && !filters.classificationValues.length)) {
    return { events: [] }
  }

  const where = {
    start: {
      [Sequelize.Op.gte]: moment.utc(filters.start).valueOf(),
      [Sequelize.Op.lt]: moment.utc(filters.end).valueOf()
    }
  }
  if (filters.streamIds && filters.streamIds.length) {
    where.stream_id = {
      [Sequelize.Op.in]: filters.streamIds
    }
  }
  if (filters.classificationValues && filters.classificationValues.length) {
    where['$classification.value$'] = { [Sequelize.Op.or]: filters.classificationValues }
  }

  const query = {
    where,
    attributes,
    include,
    offset: options.offset,
    limit: options.limit,
    order: [['start', options.descending ? 'DESC' : 'ASC']]
  }

  return pagedQuery(Event, query)
    .then(data => ({ events: data.results.map(format) }))
}

module.exports = {
  query
}
