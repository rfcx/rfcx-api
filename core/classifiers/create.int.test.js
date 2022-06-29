const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed } = require('../../common/testing/sequelize')

const app = expressApp({ has_system_role: true })

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
  const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', type_id: 1, source_id: null, parent_id: null, source_external_id: null, created_at: '2022-06-29 11:22:37.094935', update_at: '2022-06-29 11:22:37.094935' }
  await models.Classification.bulkCreate([CLASSIFICATION_1])
}

describe('POST /classifiers/:id', () => {
  test('normal user is forbidden', async () => {
    const regularUserApp = expressApp({ is_super: false })
    regularUserApp.use('/', routes)
    console.warn = jest.fn()
    const requestBody = {
      name: 'chainsaw',
      version: 1,
      classification_values: 'chainsaw'
    }

    const response = await request(regularUserApp).post('/').send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })
  test('super user can create classifier', async () => {
    // Arrange
    const superUserApp = expressApp({ is_super: true })
    superUserApp.use('/', routes)
    const requestBody = {
      name: 'chainsaw',
      version: 1,
      classification_values: 'chainsaw'
    }

    // Act
    const response = await request(superUserApp).post('/')
      .send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.headers.location).toContain('/1')
  })
})
