const request = require('supertest')
const routes = require('.')
const models = require('../../../modelsTimescale')
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

describe('DELETE /projects/:id', () => {
  test('result', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)

    const response = await request(app).delete(`/${project.id}`)

    expect(response.statusCode).toBe(204)
    const projectDeleted = await models.Project.findByPk(project.id)
    expect(projectDeleted).toBeNull()
  })

  test('not found', async () => {
    console.warn = jest.fn()

    const response = await request(app).delete('/ft1000')

    expect(response.statusCode).toBe(404)
    expect(console.warn).toHaveBeenCalled()
  })

  test('forbidden by project member', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    console.warn = jest.fn()

    const response = await request(app).delete(`/${project.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by project admin', async () => {
    const project = { id: 'ft2', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${project.id}`)

    expect(response.statusCode).toBe(204)
  })

  test('forbidden by organization member', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleMember })
    console.warn = jest.fn()

    const response = await request(app).delete(`/${project.id}`)

    expect(response.statusCode).toBe(403)
    expect(console.warn).toHaveBeenCalled()
  })

  test('deletable by organization admin', async () => {
    const organization = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft2', organizationId: organization.id, name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleAdmin })

    const response = await request(app).delete(`/${project.id}`)

    expect(response.statusCode).toBe(204)
  })
})
