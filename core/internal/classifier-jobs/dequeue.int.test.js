const routes = require('.')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await commonSetup()
})

async function commonSetup () {
}

describe('POST /internal/classifier-jobs/dequeue', () => {
  test('returns an array', async () => {
    const response = await request(app).post('/dequeue')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
