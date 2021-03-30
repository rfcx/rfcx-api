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

describe('GET /', () => {
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
})

describe('GET /:id', () => {
  test('result', async () => {
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

  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/1234')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
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

describe('POST /', () => {
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
  })

  test('missing name', async () => {
    const requestBody = {
      latitude: 10.123
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })
})
