const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('POST /classifiers/:id', () => {
  test('normal user is forbidden', async () => {
    const regularUserApp = expressApp({ is_super: false })
    regularUserApp.use('/', routes)
    console.warn = jest.fn()
    const requestBody = {
      name: 'chainsaw-model',
      version: 1,
      classification_values: 'chainsaw'
    }

    const response = await request(regularUserApp).post('/').send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })
})
