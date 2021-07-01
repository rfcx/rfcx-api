const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.create(stream)
  const stream2 = { id: 'def', name: 'my stream2', createdById: seedValues.otherUserId }
  await models.Stream.create(stream2)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  return { stream, stream2, classification, classifier }
}

describe('GET /internal/ai-hub/detections', () => {
  test('bad request', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/detections')

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong start format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: 'abc', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong end format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: 'abc' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })
})
