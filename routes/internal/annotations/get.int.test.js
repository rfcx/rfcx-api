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

describe('GET /internal/annotations', () => {
  test('bad request', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong start format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: 'abc', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong end format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: 'abc' }

    const response = await request(app).get('/').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong type start', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '12345', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('bad request with wrong type end', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: '12345' }

    const response = await request(app).get('/').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('no result', async () => {
    const requestQuery = { start: '2020-01-01T00:00:00', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })
})
