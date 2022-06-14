const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')
const moment = require('moment')
const { uuidToSlug } = require('../_utils/formatters/uuid')
const router = require('express').Router()

const app = expressApp({ has_system_role: true })
router.patch('/:id', require('./update'))
app.use('/', router)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  console.warn = jest.fn()
})

async function commonSetup () {
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
  return { stream, classification, classifierEventStrategy }
}

describe('PATCH /events/:id', () => {
  test('invalid id', async () => {
    const requestBody = { end: '2021-03-04T16:22:56.000Z' }

    const response = await request(app).patch('/abc').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('not found', async () => {
    const requestBody = { end: '2021-03-04T16:22:56.000Z' }

    const response = await request(app).patch('/af85f6e3-16db-4ecc-8de7-1e515ce1c672').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('update end timestamp when id is guid', async () => {
    const { stream, classification, classifierEventStrategy } = await commonSetup()
    const event = { id: 'de6abaab-af09-4c7a-b61f-f9658e2bf53c', streamId: stream.id, classificationId: classification.id, start: '2021-03-04T16:21:04.000Z', end: '2021-03-04T16:21:56.000Z', classifierEventStrategyId: classifierEventStrategy.id }
    await models.Event.create(event)
    const requestBody = { end: '2021-03-04T16:22:56.000Z' }

    const response = await request(app).patch(`/${event.id}`).send(requestBody)

    const newEvent = await models.Event.findByPk(event.id)
    expect(response.statusCode).toBe(204)
    expect(newEvent.classificationId).toBe(event.classificationId)
    expect(newEvent.classifierEventStrategyId).toBe(event.classifierEventStrategyId)
    expect(newEvent.streamId).toBe(event.streamId)
    expect(moment(newEvent.start).valueOf()).toBe(moment(event.start).valueOf())
    expect(moment(newEvent.end).valueOf()).toBe(moment(requestBody.end).valueOf())
  })

  test('id is slug', async () => {
    const { stream, classification, classifierEventStrategy } = await commonSetup()
    const event = { id: 'de6abaab-af09-4c7a-b61f-f9658e2bf53c', streamId: stream.id, classificationId: classification.id, start: '2021-03-04T16:21:04.000Z', end: '2021-03-04T16:21:56.000Z', classifierEventStrategyId: classifierEventStrategy.id }
    await models.Event.create(event)
    const eventSlug = uuidToSlug(event.id)
    const requestBody = { end: '2021-03-04T16:22:56.000Z' }

    const response = await request(app).patch(`/${eventSlug}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })
})
