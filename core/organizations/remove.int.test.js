const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('DELETE /organizations/:id', () => {
  test('result', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: org.createdById, organization_id: org.id, role_id: seedValues.roleOwner })

    const response = await request(app).delete(`/${org.id}`)

    expect(response.statusCode).toBe(204)
    const orgDeleted = await models.Organization.findByPk(org.id)
    expect(orgDeleted).toBeNull()
  })

  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).delete('/n0tAn0rg')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('forbidden by organization member', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: org.id, role_id: seedValues.roleMember })
    console.warn = jest.fn()

    const response = await request(app).delete(`/${org.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by organization admin', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: org.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${org.id}`)

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

    const response = await request(superApp).delete('/or1000xxxxxx')

    expect(response.statusCode).toBe(404)
  })
})
