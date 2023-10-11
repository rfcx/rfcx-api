const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(() => {
  muteConsole('warn')
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

describe('GET /streams/:id', () => {
  test('not found', async () => {
    const response = await request(app).get('/1234')

    expect(response.statusCode).toBe(404)
  })

  test('deleted stream not found', async () => {
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200, deletedAt: '2021-01-01T00:00:00.000Z' }
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('Stream not found')
  })

  test('readable by creator', async () => {
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(stream.id)
    expect(response.body.name).toBe(stream.name)
    expect(response.body.latitude).toBe(stream.latitude)
    expect(response.body.longitude).toBe(stream.longitude)
    expect(response.body.altitude).toBe(stream.altitude)
  })

  test('forbidden', async () => {
    const stream = { id: 'jagu2', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    console.warn = jest.fn()

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by stream guest', async () => {
    const stream = { id: 'jagu3', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by project guest', async () => {
    const project = { id: 'othe1', createdById: seedValues.otherUserId, name: 'Other Project' }
    const stream = { id: 'jagu4', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by organization guest', async () => {
    const organization = { id: 'orga1', createdById: seedValues.otherUserId, name: 'Other Org' }
    const project = { id: 'othe2', createdById: seedValues.otherUserId, organization_id: organization.id, name: 'Other Project' }
    const stream = { id: 'jagu5', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('country name works correct for stream coordinates', async () => {
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB' }
    await models.Stream.create(stream)

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(stream.id)
    expect(response.body.latitude).toBe(stream.latitude)
    expect(response.body.longitude).toBe(stream.longitude)
    console.debug('response.body', response.body)
    expect(response.body.countryName).toBe('Britain')
  })
})
