const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('DELETE /streams/:id', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).delete('/am1000')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by creator', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.primaryUserId }
    await models.Stream.create(stream)

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(204)
    const streamDeleted = await models.Project.findByPk(stream.id)
    expect(streamDeleted).toBeNull()
  })

  test('forbidden by stream member', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleMember })

    console.warn = jest.fn()

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by stream admin', async () => {
    const stream = { id: 'am1', name: 'Big tree', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by project member', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am2', name: 'Other big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    console.warn = jest.fn()

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by project admin', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am2', name: 'Other big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by organization member', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organization_id: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am2', name: 'Other big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleMember })
    console.warn = jest.fn()

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by organization admin', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organization_id: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    const stream = { id: 'am2', name: 'Other big tree', projectId: project.id, createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${stream.id}`)

    expect(response.statusCode).toBe(204)
  })
})
