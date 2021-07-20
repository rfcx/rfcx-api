const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed } = require('../../../utils/sequelize/testing')
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
