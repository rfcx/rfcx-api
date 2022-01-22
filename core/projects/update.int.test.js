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

describe('PATCH /projects/:id', () => {
  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).patch('/ft1000').send({})

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by creator', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)
    const requestBody = { name: 'Jungle village' }

    const response = await request(app).patch(`/${project.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
    const projectUpdated = await models.Project.findByPk(project.id)
    expect(projectUpdated.name).toBe(requestBody.name)
  })

  test('forbidden by project guest', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })
    const requestBody = { name: 'Other jungle village' }

    console.warn = jest.fn()

    const response = await request(app).patch(`/${project.id}`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by project member', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
    const requestBody = { name: 'Other jungle village' }

    const response = await request(app).patch(`/${project.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by organization guest', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })
    const requestBody = { name: 'Other jungle village' }
    console.warn = jest.fn()

    const response = await request(app).patch(`/${project.id}`).send(requestBody)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('updatable by organization member', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleMember })
    const requestBody = { name: 'Other jungle village' }

    const response = await request(app).patch(`/${project.id}`).send(requestBody)

    expect(response.statusCode).toBe(204)
  })
})
