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

describe('GET /streams', () => {
  test('no results', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(stream.id)
    expect(response.body[0].name).toBe(stream.name)
    expect(response.body[0].latitude).toBe(stream.latitude)
  })

  test('multiple results', async () => {
    await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })
    await models.Stream.create({ id: 'guard3', name: 'GU03', latitude: 10.3, longitude: 101.3, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
  })

  test('sorted results', async () => {
    const stream1 = await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const stream2 = await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/').query({ sort: 'updated_at' })

    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(stream1.id)
    expect(response.body[1].id).toBe(stream2.id)
  })

  test('reverse sorted results', async () => {
    const stream1 = await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const stream2 = await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/').query({ sort: '-updated_at' })

    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(stream2.id)
    expect(response.body[1].id).toBe(stream1.id)
  })

  test('results do not include public streams from others', async () => {
    const stream = { id: 'x456y', isPublic: true, createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(0)
  })

  test('results include public streams from me', async () => {
    const stream = { id: 'x456y', isPublic: true, createdById: seedValues.primaryUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include only public streams using only_public', async () => {
    await models.Stream.create({ id: 'public1', createdById: seedValues.otherUserId, isPublic: true, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'private2', createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })

    const response = await request(app).get('/').query({ only_public: true })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('public1')
  })

  test('results include stream guest', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include project guest', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include organization guest', async () => {
    const organization = { id: 'o789o', createdById: seedValues.otherUserId, name: 'Other Org' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, organization_id: organization.id, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })
})
