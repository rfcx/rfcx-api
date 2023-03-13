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

describe('GET /organizations/:id', () => {
  test('result', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId }
    await models.Organization.create(org)

    const response = await request(app).get(`/${org.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(org.id)
    expect(response.body.name).toBe(org.name)
  })

  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/n0tAn0rg')

    expect(response.statusCode).toBe(404)
  })

  test('forbidden', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    console.warn = jest.fn()

    const response = await request(app).get(`/${org.id}`)

    expect(response.statusCode).toBe(403)
  })

  test('readable by organization guest', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: org.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${org.id}`)

    expect(response.statusCode).toBe(200)
  })
})
