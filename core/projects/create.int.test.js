const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, truncateNonBase, seedValues } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
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

  test('UserProjectRoles row of Owner is created', async () => {
    const requestBody = {
      name: 'Test Project'
    }

    const response = await request(app).post('/').send(requestBody)
    const id = response.header.location.replace('/projects/', '')
    const userProjectRole = await models.UserProjectRole.findOne({ where: { project_id: id, user_id: seedValues.primaryUserId } })

    expect(response.statusCode).toBe(201)
    expect(userProjectRole.role_id).toBe(4)
  })
})
