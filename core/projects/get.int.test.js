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
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })

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

  test('can get external_id field only', async () => {
    const project = { id: 'ft3', name: 'House in the woods', createdById: seedValues.primaryUserId, externalId: 12345 }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })

    const response = await request(app).get(`/${project.id}`).query({ fields: 'external_id' })

    expect(response.statusCode).toBe(200)
    expect(response.body.external_id).toBe(project.externalId)
    expect(Object.keys(response.body)).toHaveLength(2) // Includes `id`
  })
})
