const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('PATCH /streams/:id', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).patch('/ft1000').send({})

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by creator', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.name).toBe(requestBody.name)
  })

  test('other member stream is updatable by creator', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    const stream = { id: 'am1', name: 'Big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Stream.create(stream)

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.name).toBe(requestBody.name)
  })

  test('hidden stream is updatable', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleOwner })
    const stream = { id: 'am1', name: 'Big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Stream.create(stream)

    const requestBody = { hidden: true }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.hidden).toBe(requestBody.hidden)
  })

  test('forbidden by stream guest', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    console.warn = jest.fn()

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by stream member', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleMember })

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by project guest', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am1', name: 'Big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    console.warn = jest.fn()

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by project member', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am1', name: 'Big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by organization guest', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am1', projectId: project.id, name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })
    console.warn = jest.fn()

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by organization member', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am1', projectId: project.id, name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleMember })

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('Returns 400 if user tries to change name to existing stream name in the project', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'pro000000000', name: 'Forest village', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner })
    const stream1 = (await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: stream1.name }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Returns 204 if user tries to change name to non-existing stream name in the project', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'pro000000000', name: 'Forest village', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner })
    await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } })
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: 'Medium tree' }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('Returns 204 if user tries to change name to same name of target stream', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'pro000000000', name: 'Forest village', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner })
    await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } })
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: 'Small tree' }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('timezone is updated when coordinates are changed', async () => {
    const newLat = 10
    const newLon = 20
    const stream = { id: 'am1', name: 'Big tree', latitude: 18, longitude: -66, timezone: 'America/Puerto_Rico', timezoneLocked: false, createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: newLat, longitude: newLon }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.latitude).toBe(newLat)
    expect(streamUpdated.longitude).toBe(newLon)
    expect(streamUpdated.timezone).toBe('Africa/Ndjamena')
  })

  test('timezone is not updated when coordinates are changed, but timezone_locked is true', async () => {
    const newLat = 10
    const newLon = 20
    const stream = { id: 'am1', name: 'Big tree', latitude: 18, longitude: -66, timezone: 'America/Puerto_Rico', timezoneLocked: true, createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: newLat, longitude: newLon }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.latitude).toBe(newLat)
    expect(streamUpdated.longitude).toBe(newLon)
    expect(streamUpdated.timezone).toBe(stream.timezone)
  })

  test('country code works well for updated stream', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: 52.775435, longitude: 23.9068233 }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.countryCode).toBe('PL')
  })

  test('country code is changed to null and timezone is UTC for undefined lat', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: undefined, longitude: -4.5 }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.timezone).toBe('UTC')
    expect(streamUpdated.countryCode).toBeNull()
  })

  test('country code is changed to null and timezone is UTC for null lat', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: null, longitude: -4.5 }
    const response2 = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response2.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.timezone).toBe('UTC')
    expect(streamUpdated.countryCode).toBeNull()
  })

  test('country code is changed to null and timezone is UTC for null lat long', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: null, longitude: null }
    const response2 = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response2.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.timezone).toBe('UTC')
    expect(streamUpdated.countryCode).toBeNull()
  })

  test('country code is changed to null and timezone is UTC for 0 lat long', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: 0, longitude: 0 }
    const response2 = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response2.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.timezone).toBe('UTC')
    expect(streamUpdated.countryCode).toBeNull()
  })

  test('country code is changed to null and timezone is UTC for 0 lat', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: 0, longitude: -4.5 }
    const response2 = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response2.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.timezone).toBe('UTC')
    expect(streamUpdated.countryCode).toBeNull()
  })

  test('country code is null for coordinates somewhere in the ocean', async () => {
    const stream = { id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

    const requestBody = { latitude: 40, longitude: -40 }
    const response2 = await request(app).patch(`/${stream.id}`).send(requestBody)
    expect(response2.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.countryCode).toBe(null)
  })

  test('min/max latitude/longitude of project change when update stream', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const requestBody = { latitude: 40.2 }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const projectAfterUpdated = await models.Project.findByPk(project.id)
    expect(projectAfterUpdated.minLatitude).toBe(requestBody.latitude)
    expect(projectAfterUpdated.maxLatitude).toBe(stream2.latitude)
    expect(projectAfterUpdated.minLongitude).toBe(stream2.longitude)
    expect(projectAfterUpdated.maxLongitude).toBe(stream.longitude)
  })

  test('min/max latitude/longitude of project change when update stream to hidden', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const requestBody = { latitude: 40.2, hidden: true }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const projectAfterUpdated = await models.Project.findByPk(project.id)
    expect(projectAfterUpdated.minLatitude).toBe(stream2.latitude)
    expect(projectAfterUpdated.maxLatitude).toBe(stream2.latitude)
    expect(projectAfterUpdated.minLongitude).toBe(stream2.longitude)
    expect(projectAfterUpdated.maxLongitude).toBe(stream2.longitude)
  })

  test('min/max latitude/longitude of project change when update all existing stream to hidden', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    await models.Stream.create(stream)

    const requestBody = { latitude: 40.2, hidden: true }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const projectAfterUpdated = await models.Project.findByPk(project.id)
    expect(projectAfterUpdated.minLatitude).toBeNull()
    expect(projectAfterUpdated.maxLatitude).toBeNull()
    expect(projectAfterUpdated.minLongitude).toBeNull()
    expect(projectAfterUpdated.maxLongitude).toBeNull()
  })

  test('min/max latitude/longitude of project change when update stream with 0 latitude', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const requestBody = { latitude: 0 }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const projectAfterUpdated = await models.Project.findByPk(project.id)
    expect(projectAfterUpdated.minLatitude).toBe(stream2.latitude)
    expect(projectAfterUpdated.maxLatitude).toBe(stream2.latitude)
    expect(projectAfterUpdated.minLongitude).toBe(stream2.longitude)
    expect(projectAfterUpdated.maxLongitude).toBe(stream2.longitude)
  })
})
