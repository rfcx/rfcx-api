const request = require('supertest')
const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed } = require('../../../utils/sequelize/testing')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('POST /projects', () => {
  test('required fields only', async () => {
    const requestBody = {
      name: 'Forest village'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.header.location).toMatch(/^\/projects\/[0-9a-z]+$/)
    const id = response.header.location.replace('/projects/', '')
    const project = await models.Project.findByPk(id)
    expect(project.name).toBe(requestBody.name)
  })

  test('missing name', async () => {
    const requestBody = {}
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })
})
