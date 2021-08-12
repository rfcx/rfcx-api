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
    expect(stream.createdById).toBe(seedValues.primaryUserId)
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

  test('returns 201 when user creates a stream in a project he has a Member role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const requestBody = {
      name: 'Trail 40',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
    expect(stream.createdById).toBe(seedValues.primaryUserId)
  })
  test('returns 201 when user creates a stream in a project he has an Admin role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const requestBody = {
      name: 'Trail 41',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
    expect(stream.createdById).toBe(seedValues.primaryUserId)
  })
  test('returns 403 when user creates a stream in a project he has only a Guest role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const requestBody = {
      name: 'Trail 42',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(403)
  })
  test('returns 201 with timezone value', async () => {
    const project = { id: 'foo', name: 'my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const requestBody = {
      name: 'Trail 43',
      latitude: 15,
      longitude: 100,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.timezone).toBe('Asia/Bangkok')
  })
  test('returns 201 with null latitude and longitude cause null timezone value', async () => {
    const project = { id: 'foo', name: 'my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const requestBody = {
      name: 'Trail 44',
      latitude: null,
      longitude: null,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.timezone).toBe(null)
  })
})
