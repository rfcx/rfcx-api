const request = require('supertest')
const moment = require('moment')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const { uuidToSlug } = require('../_utils/formatters/uuid')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const classification = { id: 7718, value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 88, name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const eventStrategy = { id: 47, name: 'Any detection in a 3 hour period', functionName: 'window_count' }
  await models.EventStrategy.create(eventStrategy)
  const classifierEventStrategy = { id: 56, classifierId: classifier.id, eventStrategyId: eventStrategy.id }
  await models.ClassifierEventStrategy.create(classifierEventStrategy)
  const streamIds = ['844qvbjhmzkr', '934a43f2fp3q', '2kg1xourixpz', '3fqoc4okv9en']
  for (let i = 0; i < streamIds.length; i++) {
    await models.Stream.create({ id: streamIds[i], name: `Tembe ${i + 1}`, createdById: seedValues.primaryUserId })
  }
  return { classification, classifier, classifierEventStrategy, streamIds }
}

describe('GET /events', () => {
  test('client error with no end', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/').query({ start: '2021-04-14T00:00:00Z' })

    expect(response.statusCode).toBe(400)
  })

  test('no results', async () => {
    const response = await request(app).get('/').query({ start: '2021-04-14T00:00:00Z', end: '2021-04-21T23:59:59Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(0)
  })

  test('result objects contain id, stream_id, start, end, classification', async () => {
    const { classification, classifierEventStrategy, streamIds } = await commonSetup()
    const event = {
      id: 'd72d4071-889a-4570-b419-b73ab1696f5f',
      streamId: streamIds[0],
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: '2021-04-16T12:12:12.500Z',
      end: '2021-04-16T12:42:42.500Z'
    }
    await models.Event.create(event)
    const query = {
      start: '2021-04-14T00:00:00Z',
      end: '2021-04-21T23:59:59Z'
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(uuidToSlug(event.id))
    expect(response.body[0].stream_id).toBe(event.streamId)
    expect(response.body[0].start).toBe(event.start)
    expect(response.body[0].end).toBe(event.end)
    expect(response.body[0].classification.value).toBe(classification.value)
  })

  test('filter by start and end', async () => {
    const { classification, classifierEventStrategy, streamIds } = await commonSetup()
    const events = [
      '2021-04-16T12:12:12.500Z',
      '2021-04-16T13:13:13.500Z',
      '2021-04-16T14:14:14.500Z',
      '2021-04-16T15:15:15.500Z'
    ].map((start, i) => ({
      id: `d72d4071-889a-4570-b419-b73ab1696f5${i}`,
      streamId: streamIds[0],
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      start: start,
      end: moment(start).add(10, 'minutes').toISOString()
    }))
    await models.Event.bulkCreate(events)
    const query = {
      start: '2021-04-16T13:00:00Z',
      end: '2021-04-16T15:00:00Z'
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
  })

  test('latest event for stream', async () => {
    const { classification, classifierEventStrategy, streamIds } = await commonSetup()
    const events = [
      { streamId: streamIds[0], start: '2021-04-16T12:12:12.500Z' },
      { streamId: streamIds[0], start: '2021-04-16T16:16:16.500Z' },
      { streamId: streamIds[1], start: '2021-04-16T13:13:13.500Z' },
      { streamId: streamIds[0], start: '2021-04-16T14:14:14.500Z' },
      { streamId: streamIds[1], start: '2021-04-16T15:15:15.500Z' }
    ].map((e, i) => ({
      ...e,
      id: `d72d4071-889a-4570-b419-b73ab1696f5${i}`,
      classificationId: classification.id,
      classifierEventStrategyId: classifierEventStrategy.id,
      end: moment(e.start).add(10, 'minutes').toISOString()
    }))
    await models.Event.bulkCreate(events)
    const query = {
      start: '2021-04-16T12:00:00Z',
      end: '2021-04-16T17:00:00Z',
      streams: [streamIds[0]],
      descending: 'true',
      limit: '1'
    }

    const response = await request(app).get('/').query(query)

    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(events[1].start)
  })
})
