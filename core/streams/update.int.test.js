const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  models.Sequelize.Op.iLikeBk = models.Sequelize.Op.iLike
  models.Sequelize.Op.iLike = models.Sequelize.Op.like // Sqlite doesn't support ilike
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})
afterAll(() => {
  models.Sequelize.Op.iLike = models.Sequelize.Op.iLikeBk
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

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.name).toBe(requestBody.name)
  })

  test('other member stream is updatable by creator', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    const stream = { id: 'am1', name: 'Big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Stream.create(stream)

    const requestBody = { name: 'Huge bush' }
    const response = await request(app).patch(`/${stream.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const streamUpdated = await models.Stream.findByPk(stream.id)
    expect(streamUpdated.name).toBe(requestBody.name)
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
    const stream1 = (await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: stream1.name }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('Returns 204 if user tries to change name to non-existing stream name in the project', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'pro000000000', name: 'Forest village', createdById: seedValues.primaryUserId } }))[0]
    await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } })
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: 'Medium tree' }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('Returns 204 if user tries to change name to same name of target stream', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'pro000000000', name: 'Forest village', createdById: seedValues.primaryUserId } }))[0]
    await models.Stream.findOrCreate({ where: { id: 'str000000001', name: 'Big tree', createdById: seedValues.primaryUserId, project_id: project.id } })
    const stream2 = (await models.Stream.findOrCreate({ where: { id: 'str000000002', name: 'Small tree', createdById: seedValues.primaryUserId, project_id: project.id } }))[0]

    const requestBody = { name: 'Small tree' }
    const response = await request(app).patch(`/${stream2.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })
})
