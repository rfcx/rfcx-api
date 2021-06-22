process.env.MEDIA_API_BASE_URL = 'http://test-api.rfcx.org/'
const passport = require('passport')
passport.authenticate = jest.fn(() => {
  return function (authType, options, callback) { callback(null) }
})

const streamsPath = '../../../services/streams'
jest.mock(streamsPath)
const { getStreamRangeToken } = require(streamsPath)
getStreamRangeToken.mockImplementation(() => 'test-token')

const usersPath = '../../../services/users/users-service-legacy'
jest.mock(usersPath)
const { getAllUserSiteGuids } = require(usersPath)

const guardianGroupsPath = '../../../services/guardians/guardian-group-service'
jest.mock(guardianGroupsPath)
const { getGroupsByShortnames } = require(guardianGroupsPath)

const request = require('supertest')
const moment = require('moment')
const routes = require('./events.js')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole, getRandomInRange } = require('../../../utils/sequelize/testing')
const { ISOToGluedDateStr } = require('../../../utils/misc/datetime')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})
afterEach(() => {
  getAllUserSiteGuids.mockRestore()
  getGroupsByShortnames.mockRestore()
})

async function commonSetup () {
  const classification = { id: 7718, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 88, name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const eventStrategy = { id: 47, name: 'Any detection in a 3 hour period', functionName: 'window_count' }
  await models.EventStrategy.create(eventStrategy)
  const classifierEventStrategy = { id: 56, classifierId: classifier.id, eventStrategyId: eventStrategy.id }
  await models.ClassifierEventStrategy.create(classifierEventStrategy)
  const streamIds = ['844qvbjhmzkr', '934a43f2fp3q', '2kg1xourixpz', '3fqoc4okv9en']
  const streams = []
  streamIds.forEach(async (id, i) => {
    const stream = {
      id,
      name: `Tembe ${i + 1}`,
      createdById: seedValues.primaryUserId,
      latitude: getRandomInRange(-90, 90, 3),
      longitude: getRandomInRange(-180, 180, 3)
    }
    streams.push(stream)
    await models.Stream.create(stream)
  })
  return { classification, classifier, classifierEventStrategy, streams }
}

describe('GET /v2/events', () => {
  test('returns no events', async () => {
    const response = await request(app).get('/').query({})

    expect(response.statusCode).toBe(200)
    expect(response.body.events).toBeDefined()
    expect(response.body.events.length).toBe(0)
  })

  test('validation error if limit is greater than 1000', async () => {
    const response = await request(app).get('/').query({ limit: 10000 })
    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Validation errors: Parameter \'limit\' is larger than the max 1000.')
  })

  test('returns one event', async () => {
    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    await models.Event.create(event)

    const response = await request(app).get('/').query({})

    expect(response.statusCode).toBe(200)
    const ev = response.body.events[0]
    expect(ev.guid).toBe(event.id)
    expect(ev.audioGuid).toBe(event.id)
    expect(ev.audioGuid).toBe(event.id)
    const endDate = moment.utc(event.start).add(1, 'minute').toISOString()
    expect(ev.urls.mp3).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event.streamId}_t${ISOToGluedDateStr(event.start)}.${ISOToGluedDateStr(endDate)}_fmp3.mp3?stream-token=test-token`)
    expect(ev.urls.opus).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event.streamId}_t${ISOToGluedDateStr(event.start)}.${ISOToGluedDateStr(endDate)}_fopus.opus?stream-token=test-token`)
    expect(ev.urls.png).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event.streamId}_t${ISOToGluedDateStr(event.start)}.${ISOToGluedDateStr(endDate)}_z95_wdolph_g1_fspec_d1269.196.png?stream-token=test-token`)
    expect(ev.createdAt).toBeDefined()
    expect(ev.latitude).toBe(streams[0].latitude)
    expect(ev.longitude).toBe(streams[0].longitude)
    expect(ev.siteGuid).toBe(`stream_${streams[0].id}`)
    expect(ev.audioMeasuredAt).toBe(new Date(event.start).valueOf())
    expect(ev.guardianGuid).toBe(streams[0].id)
    expect(ev.audioDuration).toBe(60000)
    expect(ev.value).toBe(classification.value)
    expect(ev.label).toBe(classification.title)
    expect(ev.confirmed).toBe(0)
    expect(ev.rejected).toBe(0)
    expect(ev.last_review).toBeNull()
    expect(ev.siteTimezone).toBeNull()
    expect(ev.confidence).toBe(1)
    expect(ev.aiName).toBeNull()
    expect(ev.aiGuid).toBeNull()
    expect(ev.aiMinConfidence).toBeNull()
  })

  test('returns no events if value does not match', async () => {
    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    await models.Event.create(event)

    const response = await request(app).get('/').query({ values: ['vehicle'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.events).toBeDefined()
    expect(response.body.events.length).toBe(0)
  })

  test('returns no events if guardian group does not match', async () => {
    getAllUserSiteGuids.mockImplementation(() => ['site1', 'site2', 'site3'])
    getGroupsByShortnames.mockImplementation(() => [
      { Site: { guid: 'site4' } }
    ])

    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    await models.Event.create(event)

    const response = await request(app).get('/').query({ guardian_groups: ['group4'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.events).toBeDefined()
    expect(response.body.events.length).toBe(0)
  })

  test('returns event if guardian group matches available groups', async () => {
    getAllUserSiteGuids.mockImplementation(() => ['site1', 'site2', 'site3'])
    getGroupsByShortnames.mockImplementation(() => [
      {
        Guardians: [
          { guid: streams[0].id }
        ],
        GuardianAudioEventValues: [
          { value: classification.value, label: classification.title }
        ],
        Site: { guid: 'site3' }
      }
    ])

    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    await models.Event.create(event)

    const response = await request(app).get('/').query({ guardian_groups: ['group4'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.events[0].guid).toBe(event.id)
  })

  test('returns several events', async () => {
    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event1 = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    const classification2 = { id: 7719, value: 'vehicle', title: 'Vehicle', type_id: 1, source_id: 1 }
    await models.Classification.create(classification2)
    const event2 = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5e',
      streamId: streams[1].id,
      classificationId: classification2.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(2, 'days').toISOString(),
      end: moment().subtract(2, 'days').add(10, 'seconds').toISOString()
    }
    await models.Event.create(event1)
    await models.Event.create(event2)

    const response = await request(app).get('/').query({})

    expect(response.statusCode).toBe(200)
    expect(response.body.events[0].guid).toBe(event1.id)

    const ev = response.body.events[1]
    expect(ev.guid).toBe(event2.id)
    expect(ev.audioGuid).toBe(event2.id)
    expect(ev.audioGuid).toBe(event2.id)
    expect(ev.urls.mp3).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event2.streamId}_t${ISOToGluedDateStr(event2.start)}.${ISOToGluedDateStr(event2.end)}_fmp3.mp3?stream-token=test-token`)
    expect(ev.urls.opus).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event2.streamId}_t${ISOToGluedDateStr(event2.start)}.${ISOToGluedDateStr(event2.end)}_fopus.opus?stream-token=test-token`)
    expect(ev.urls.png).toBe(`http://test-api.rfcx.org/internal/assets/streams/${event2.streamId}_t${ISOToGluedDateStr(event2.start)}.${ISOToGluedDateStr(event2.end)}_z95_wdolph_g1_fspec_d1269.196.png?stream-token=test-token`)
    expect(ev.createdAt).toBeDefined()
    expect(ev.latitude).toBe(streams[1].latitude)
    expect(ev.longitude).toBe(streams[1].longitude)
    expect(ev.siteGuid).toBe(`stream_${streams[1].id}`)
    expect(ev.audioMeasuredAt).toBe(new Date(event2.start).valueOf())
    expect(ev.guardianGuid).toBe(streams[1].id)
    expect(ev.audioDuration).toBe(10000)
    expect(ev.value).toBe(classification2.value)
    expect(ev.label).toBe(classification2.title)
    expect(ev.confirmed).toBe(0)
    expect(ev.rejected).toBe(0)
    expect(ev.last_review).toBeNull()
    expect(ev.siteTimezone).toBeNull()
    expect(ev.confidence).toBe(1)
    expect(ev.aiName).toBeNull()
    expect(ev.aiGuid).toBeNull()
    expect(ev.aiMinConfidence).toBeNull()
  })

  test('returns several events in ascending order', async () => {
    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const event1 = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streams[0].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(1, 'day').toISOString(),
      end: moment().subtract(1, 'day').add(10, 'minutes').toISOString()
    }
    const event2 = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5e',
      streamId: streams[1].id,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: moment().subtract(2, 'days').toISOString(),
      end: moment().subtract(2, 'days').add(10, 'seconds').toISOString()
    }
    await models.Event.create(event1)
    await models.Event.create(event2)

    const response = await request(app).get('/').query({ dir: 'ASC' })

    expect(response.statusCode).toBe(200)
    expect(response.body.events[0].guid).toBe(event2.id)
    expect(response.body.events[1].guid).toBe(event1.id)
  })

  test('returns several events with limit and offset', async () => {
    const { classification, classifierEventStrategy, streams } = await commonSetup()
    const indexes = [...Array(30).keys()].splice(10) // generate ids from 10 to 29
    const events = []
    for (const index of indexes) {
      const event = {
        id: `d72d4071-889a-4570-b419-b73ab1696f${index}`,
        streamId: streams[0].id,
        classificationId: classification.id,
        classifierEventStrategyId: classifierEventStrategy.id,
        start: moment().subtract(index, 'day').toISOString(),
        end: moment().subtract(index, 'day').add(30, 'seconds').toISOString()
      }
      events.push(event)
      await models.Event.create(event)
    }

    const response = await request(app).get('/').query({ limit: 10, offset: 10 })

    expect(response.statusCode).toBe(200)
    expect(response.body.events[0].guid).toBe(events[10].id)
    expect(response.body.events[9].guid).toBe(events[19].id)
  })
})
