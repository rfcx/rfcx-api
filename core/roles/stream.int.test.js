const request = require('supertest')
const routes = require('./stream')
const models = require('../_models')
const { truncate, expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
  await truncateNonBase(models)
})
afterEach(async () => {
  await truncate({ Stream: models.Stream, UserStreamRole: models.UserStreamRole, Project: models.Project, UserProjectRole: models.UserProjectRole })
})
afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

async function commonSetup () {
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.create(stream)
  return { stream }
}

describe('GET streams/:id/permissions', () => {
  test('returns CRUD for user stream', async () => {
    const { stream } = await commonSetup()

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
    expect(permissions.includes('D')).toBeTruthy()
  })

  test('returns 403 error for not user stream', async () => {
    const stream = { id: 'abc', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(403)
  })

  test('returns R for a public stream which is not yours', async () => {
    const stream = { id: 'abc', name: 'public stream', isPublic: true, createdById: seedValues.otherUserId }
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('R')).toBeTruthy()
  })

  test('returns CRUD for a stream which you have an Admin role', async () => {
    const stream = { id: 'abc', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleAdmin })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
    expect(permissions.includes('D')).toBeTruthy()
  })

  test('returns CRUD for a public stream which you have an Admin role', async () => {
    const stream = { id: 'abc', name: 'not my stream', isPublic: true, createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleAdmin })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
    expect(permissions.includes('D')).toBeTruthy()
  })

  test('returns CRU for a stream which you have a Member role', async () => {
    const stream = { id: 'abc', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
  })

  test('returns CRU for a stream which you have a Guest role', async () => {
    const stream = { id: 'abc', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('R')).toBeTruthy()
  })

  test('returns CRUD for a stream which belongs to a project for which you have an Admin role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    const stream = { id: 'bar', name: 'not my stream', createdById: seedValues.otherUserId, project_id: 'foo' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
    expect(permissions.includes('D')).toBeTruthy()
  })

  test('returns CRUD for a stream which belongs to a project for which you have a Member role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    const stream = { id: 'bar', name: 'not my stream', createdById: seedValues.otherUserId, project_id: 'foo' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('C')).toBeTruthy()
    expect(permissions.includes('R')).toBeTruthy()
    expect(permissions.includes('U')).toBeTruthy()
  })

  test('returns CRUD for a stream which belongs to a project for which you have a Guest role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    const stream = { id: 'bar', name: 'not my stream', createdById: seedValues.otherUserId, project_id: 'foo' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(200)
    const permissions = response.body
    expect(permissions.includes('R')).toBeTruthy()
  })

  test('returns 403 for a private stream which belongs to a public project', async () => {
    const project = { id: 'foo', name: 'not my project', isPublic: true, createdById: seedValues.otherUserId }
    const stream = { id: 'bar', name: 'not my stream', isPublic: false, createdById: seedValues.otherUserId, project_id: 'foo' }
    await models.Project.create(project)
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}/permissions`).send()

    expect(response.statusCode).toBe(403)
  })

  test('returns 404 for a missing stream', async () => {
    const response = await request(app).get('/streams/random/permissions').send()
    expect(response.statusCode).toBe(404)
  })
})
