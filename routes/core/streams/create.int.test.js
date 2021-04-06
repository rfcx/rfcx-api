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

describe('POST /streams', () => {
  test('required fields only', async () => {
    const requestBody = {
      name: 'Trail 39',
      latitude: 10.123,
      longitude: 101.456
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.header.location).toMatch(/^\/streams\/[0-9a-z]+$/)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
  })

  test('missing name', async () => {
    const requestBody = {
      latitude: 10.123
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })
})
