const request = require('supertest')
const routes = require('.')
const models = require('../../../models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

describe('GET /projects/:id', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/ft1000')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by creator', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)

    const response = await request(app).get(`/${project.id}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(project.id)
    expect(response.body.name).toBe(project.name)
  })

  test('forbidden', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    console.warn = jest.fn()

    const response = await request(app).get(`/${project.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('readable by project guest', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}`)

    expect(response.statusCode).toBe(200)
  })

  test('readable by organization guest', async () => {
    const organization = { id: 'o789o', createdById: seedValues.otherUserId, name: 'Other Org' }
    const project = { id: 'ft2', name: 'Other forest village', organizationId: organization.id, createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get(`/${project.id}`)

    expect(response.statusCode).toBe(200)
  })
})
