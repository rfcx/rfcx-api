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

describe('GET /projects', () => {
  test('no results', async () => {
    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const project = { id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId }
    await models.Project.create(project)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(project.id)
    expect(response.body[0].name).toBe(project.name)
  })

  test('two results', async () => {
    await models.Project.create({ id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId })
    await models.Project.create({ id: 'ft2', name: 'Forest outpost', createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
  })

  test('unreadable results hidden', async () => {
    await models.Project.create({ id: 'ft1', name: 'Forest village', createdById: seedValues.primaryUserId })
    await models.Project.create({ id: 'ft3', name: 'Other forest outpost', createdById: seedValues.otherUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('readable by project guest', async () => {
    const project = { id: 'ft3', name: 'Other forest village', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ project_id: project.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('readable by organization guest', async () => {
    const org = { id: 'r0F1c2X3', name: 'RFCx', createdById: seedValues.otherUserId }
    const project = { id: 'ft3', name: 'Other forest village', organizationId: org.id, createdById: seedValues.otherUserId }
    await models.Organization.create(org)
    await models.Project.create(project)
    await models.UserOrganizationRole.create({ organization_id: org.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })
})
