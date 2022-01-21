const routes = require('.')
const models = require('../../models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
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

describe('GET /streams/:id', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/1234')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by creator', async () => {
    const stream = { id: 'j123s', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
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
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    console.warn = jest.fn()

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by stream guest', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by project guest', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by organization guest', async () => {
    const organization = { id: 'o789o', createdById: seedValues.otherUserId, name: 'Other Org' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, organization_id: organization.id, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })
})
