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
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, external_id: 'cccddd', name: 'chainsaw model', version: 1, created_by_id: seedValues.primaryUserId, model_runner: 'tf2', model_url: 's3://something' }
  await models.Classifier.create(classifier)
  return { stream, classification, classifier }
}

describe('GET /internal/ai-hub/reviews', () => {
  test('bad request', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/reviews')

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong start format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: 'abc', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/reviews').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong end format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: 'abc' }

    const response = await request(app).get('/reviews').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('request with number type start', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '12345', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/reviews').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('request with number type end', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: '12345' }

    const response = await request(app).get('/reviews').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('no result', async () => {
    const requestQuery = { start: '2020-01-01T00:00:00', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/reviews').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('get detectons intergrate with empty annotations', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, classifier_id: classifier.id, classification_id: classification.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', confidence: 0.9 }
    await models.Detection.create(detection)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/reviews').query(requestQuery)

    const respReview1 = response.body[0]
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(respReview1.number_of_reviewed).toBe(0)
    expect(respReview1.number_of_positive).toBe(0)
    expect(respReview1.me_reviewed).toBe(false)
    expect(respReview1.me_positive).toBe(false)
    expect(respReview1.me_negative).toBe(false)
  })
})
