const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('DELETE /organizations/:id', () => {
  test('result', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId }
    await models.Organization.create(org)

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
})
