const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate } = require('../../../utils/sequelize/testing')

const request = require('supertest')
const express = require('express')

const app = express()

const primaryUserId = 1
const primaryUserGuid = 'abc123'
const primaryUserEmail = 'jb@astonmartin.com'
const otherUserId = 2
const roleAdmin = 1
const roleMember = 2
const roleGuest = 3

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use((req, res, next) => {
  req.rfcx = { auth_token_info: { id: primaryUserId, guid: primaryUserGuid, email: primaryUserEmail } }
  next()
})
app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
})
beforeEach(async () => {
  await truncate(models)
  await models.User.create({ id: primaryUserId, guid: primaryUserGuid, username: 'jb', firstname: 'James', lastname: 'Bond', email: primaryUserEmail })
  await models.User.create({ id: otherUserId, guid: 'def456', username: 'em', firstname: 'Eve', lastname: 'Moneypenny', email: 'em@astonmartin.com' })
  await models.Role.create({ id: roleAdmin, name: 'Admin' })
  await models.Role.create({ id: roleMember, name: 'Member' })
  await models.Role.create({ id: roleGuest, name: 'Guest' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'C' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'R' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'U' })
  await models.RolePermission.create({ role_id: roleAdmin, permission: 'D' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'C' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'R' })
  await models.RolePermission.create({ role_id: roleMember, permission: 'U' })
  await models.RolePermission.create({ role_id: roleGuest, permission: 'R' })
})

describe('GET /', () => {
  test('no results', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: primaryUserId })

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
    const stream = { id: 'j123s', createdById: primaryUserId, name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, altitude: 200 }
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
    const stream = { id: 'x456y', createdById: otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    console.warn = jest.fn()

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by stream guest', async () => {
    const stream = { id: 'x456y', createdById: otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: primaryUserId, stream_id: stream.id, role_id: roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by project guest', async () => {
    const project = { id: 'p123p', createdById: otherUserId, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: primaryUserId, project_id: project.id, role_id: roleGuest })

    const response = await request(app).get(`/${stream.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by organization guest', async () => {
    const organization = { id: 'o789o', createdById: otherUserId, name: 'Other Org' }
    const project = { id: 'p123p', createdById: otherUserId, organization_id: organization.id, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: primaryUserId, organization_id: organization.id, role_id: roleGuest })

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
