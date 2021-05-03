const routes = require('./project')
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

describe('GET /projects/:id/users', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/1234/users')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('not have permission', async () => {
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    console.warn = jest.fn()

    const response = await request(app).get(`/${project.id}/users`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('have permission', async () => {
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${project.id}/users`)

    expect(response.statusCode).toBe(200)
  })
})

describe('PUT /projects/:id/users', () => {
  test('create success', async () => {
    const requestBody = {
      email: 'john@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
    await models.User.create({ email: 'john@doe.com', guid: 'test'})

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.body.email).toBe(requestBody.email)
  })

  test('not found users', async () => {
    const requestBody = {
      email: 'john1@doe.com',
      role: 'Member'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).put(`/${project.id}/users`).send(requestBody)

    expect(response.statusCode).toBe(404)
  })
})

describe('DELETE /projects/:id/users', () => {
  test('delete success', async () => {
    const requestBody = {
      email: 'john@doe.com'
    }
    const project = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Project Test' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
  
    const response = await request(app).delete(`/${project.id}/users`).send(requestBody)
  
    expect(response.statusCode).toBe(200)
  })
})
