const routes = require('.')
const models = require('../../_models')
const { expressApp, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
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
