const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const moment = require('moment')
const { slugToUuid } = require('../_utils/formatters/uuid')
const router = require('express').Router()

const app = expressApp({ has_system_role: true })
router.post('/', require('./create'))
app.use('/', router)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('POST /events', () => {
  test('invalid stream id', async () => {
    const classification = { id: 1, value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 }
    await models.Classification.create(classification)
    const classifier = { id: 2, name: 'chainsaw', version: 2, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 'unknown' }
    await models.Classifier.create(classifier)
    const eventStrategy = { id: 3, name: 'something', functionName: 'test' }
    await models.EventStrategy.create(eventStrategy)
    const classifierEventStrategy = { id: 4, classifierId: classifier.id, eventStrategyId: eventStrategy.id }
    await models.ClassifierEventStrategy.create(classifierEventStrategy)
    const requestBody = {
      stream: 'nonsense',
      classification: classification.value,
      start: '2021-03-04T16:21:04.000Z',
      end: '2021-03-04T16:21:56.000Z',
      classifier_event_strategy: classifierEventStrategy.id
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('invalid classification value', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    const classifier = { id: 2, name: 'chainsaw', version: 2, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 'unknown' }
    await models.Classifier.create(classifier)
    const eventStrategy = { id: 3, name: 'something', functionName: 'test' }
    await models.EventStrategy.create(eventStrategy)
    const classifierEventStrategy = { id: 4, classifierId: classifier.id, eventStrategyId: eventStrategy.id }
    await models.ClassifierEventStrategy.create(classifierEventStrategy)
    const requestBody = {
      stream: stream.id,
      classification: 'nonsense',
      start: '2021-03-04T16:21:04.000Z',
      end: '2021-03-04T16:21:56.000Z',
      classifier_event_strategy: classifierEventStrategy.id
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('required fields only', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    const classification = { id: 1, value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 }
    await models.Classification.create(classification)
    const classifier = { id: 2, name: 'chainsaw', version: 2, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 'unknown' }
    await models.Classifier.create(classifier)
    const eventStrategy = { id: 3, name: 'something', functionName: 'test' }
    await models.EventStrategy.create(eventStrategy)
    const classifierEventStrategy = { id: 4, classifierId: classifier.id, eventStrategyId: eventStrategy.id }
    await models.ClassifierEventStrategy.create(classifierEventStrategy)
    const requestBody = {
      stream: stream.id,
      classification: classification.value,
      start: '2021-03-04T16:21:04.000Z',
      end: '2021-03-04T16:21:56.000Z',
      classifier_event_strategy: classifierEventStrategy.id
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.header.location).toMatch(/^\/events\/[0-9a-zA-Z\-_]+$/)
    const idSlug = response.header.location.replace('/events/', '')
    const event = await models.Event.findByPk(slugToUuid(idSlug))
    expect(event.classificationId).toBe(classification.id)
    expect(event.classifierEventStrategyId).toBe(classifierEventStrategy.id)
    expect(event.streamId).toBe(stream.id)
    expect(moment(event.start).valueOf()).toBe(moment(requestBody.start).valueOf())
    expect(moment(event.end).valueOf()).toBe(moment(requestBody.end).valueOf())
  })
})
