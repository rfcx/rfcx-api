const request = require('supertest')
const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await truncateNonBase(models)
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('GET /organizations', () => {
  test('no results', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const org = await models.Organization.create({ id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(org.id)
    expect(response.body[0].name).toBe(org.name)
  })

  test('two results', async () => {
    await models.Organization.create({ id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId })
    await models.Organization.create({ id: 'nu1234567890', name: 'NU', createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
  })

  test('unreadable results hidden', async () => {
    await models.Organization.create({ id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.primaryUserId })
    await models.Organization.create({ id: 'nu1234567890', name: 'NU', createdById: seedValues.otherUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('readable by organization guest', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.UserOrganizationRole.create({ organization_id: org.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })
})
