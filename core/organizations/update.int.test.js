const request = require('supertest')
const routes = require('.')
const models = require('../../models')
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

describe('PATCH /organizations/:id', () => {
  test('result', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId }
    await models.Organization.create(org)
    const requestBody = { name: 'Rainforest Connection' }

    const response = await request(app).patch(`/${org.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const orgUpdated = await models.Organization.findByPk(org.id)
    expect(orgUpdated.name).toBe(requestBody.name)
  })

  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).patch('/n0tAn0rg').send({})

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('forbidden by organization guest', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: org.id, role_id: seedValues.roleGuest })
    console.warn = jest.fn()

    const response = await request(app).patch(`/${org.id}`).send({})

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by organization member', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: org.id, role_id: seedValues.roleMember })
    const requestBody = { name: 'Rainforest Connection' }

    const response = await request(app).patch(`/${org.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })
})
