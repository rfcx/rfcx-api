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
    await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })

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

  // REGRESSION GUARD (2026-09-16): a SUPER deleting a nonexistent id must get
  // 404, not 204.
  //
  // The 'not found' test above runs as a NORMAL user, so `deletableBy` is set
  // and the permission pre-check produces the 404 -- it passes on the broken
  // code too. A super/system-role caller has `deletableBy === undefined`, which
  // SKIPS that check, so before this fix the request fell through to a 0-row
  // `destroy()` that does not throw and the route answered **204**.
  //
  // Not hypothetical: measured on prod logs 2026-09-16, 3 of 12
  // `DELETE /projects/undefined` requests returned 204. It matters because
  // bio-api verifies its core delete with `if (response.status !== 204) throw`,
  // so the one guard in the cross-plane delete chain that can fail loudly was
  // validating against a status that could not distinguish success from a
  // no-op. rfcx-local OPEN-ITEMS 330 items (4)/(6).
  test('super deleting a nonexistent id gets 404, not 204', async () => {
    const superApp = expressApp({ is_super: true })
    superApp.use('/', routes)
    console.warn = jest.fn()

    const response = await request(superApp).delete('/st1000xxxxxx')

    expect(response.statusCode).toBe(404)
  })
})
