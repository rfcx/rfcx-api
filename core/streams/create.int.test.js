const arbimonService = require('../_services/arbimon')
const routes = require('.')
const models = require('../_models')
const { truncate, truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')

jest.mock('../_services/arbimon', () => {
  return {
    isEnabled: true,
    createSite: jest.fn(async () => { return await Promise.resolve({ site_id: 123 }) })
  }
})

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

afterEach(async () => {
  await truncate({ Stream: models.Stream, UserStreamRole: models.UserStreamRole, Project: models.Project, UserProjectRole: models.UserProjectRole })
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

describe('POST /streams', () => {
  test('missing name', async () => {
    const requestBody = {
      latitude: 10.123
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })

  test('arbimon failed creating a site', async () => {
    arbimonService.createSite.mockImplementationOnce(() => { throw new Error() })
    const requestBody = {
      name: 'Trail 39',
      latitude: 10.123,
      longitude: 101.456
    }
    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(500)
    const streams = await models.Stream.findAll({ where: { name: 'Trail 39' } })
    expect(streams.length).toBe(0)
  })

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
    expect(stream.externalId).toBe(123)
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

  test('returns 201 when defined id in request body', async () => {
    const definedId = 'abcdef123456'
    const requestBody = {
      id: definedId,
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe(definedId)
  })

  test('returns 400 when id length less than minimum(12)', async () => {
    const requestBody = {
      id: 'abcdef12345',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id length more than minimum(12)', async () => {
    const requestBody = {
      id: 'abcdef1234567',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id has uppercase symbols', async () => {
    const requestBody = {
      id: 'ABcdef1234567',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id has special characters', async () => {
    const requestBody = {
      id: 'abcd-f1234567',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })
})
