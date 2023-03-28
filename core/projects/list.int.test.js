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

  test('permission field Member role for project list', async () => {
    const project1 = { id: 'p1', name: 'Other forest village1', createdById: seedValues.otherUserId }
    const project2 = { id: 'p2', name: 'Other forest village2', createdById: seedValues.otherUserId }
    await models.Project.create(project1)
    await models.Project.create(project2)
    await models.UserProjectRole.create({ project_id: project1.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleMember })
    await models.UserProjectRole.create({ project_id: project2.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleMember })

    const response = await request(app).get('/').query({ fields: ['id', 'permissions'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].permissions).toEqual(['C', 'R', 'U'])
    expect(response.body[1].permissions).toEqual(['C', 'R', 'U'])
  })

  test('permission field Guest role on Organization for project list', async () => {
    const org = { id: 'o1', name: 'RFCx', createdById: seedValues.otherUserId }
    const project1 = { id: 'p1', name: 'Other forest village1', createdById: seedValues.otherUserId, organization_id: org.id }
    const project2 = { id: 'p2', name: 'Other forest village2', createdById: seedValues.otherUserId, organization_id: org.id }
    await models.Organization.create(org)
    await models.Project.create(project1)
    await models.Project.create(project2)
    await models.UserOrganizationRole.create({ organization_id: org.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleGuest })

    const response = await request(app).get('/').query({ fields: ['id', 'permissions'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].permissions).toEqual(['R'])
    expect(response.body[1].permissions).toEqual(['R'])
  })

  test('permission field Guest role on Organization but Member role on project for project list', async () => {
    const org = { id: 'o1', name: 'RFCx', createdById: seedValues.otherUserId }
    const project1 = { id: 'p1', name: 'Other forest village1', createdById: seedValues.otherUserId, organization_id: org.id }
    await models.Organization.create(org)
    await models.Project.create(project1)
    await models.UserOrganizationRole.create({ organization_id: org.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleGuest })
    await models.UserProjectRole.create({ project_id: project1.id, user_id: seedValues.primaryUserId, role_id: seedValues.roleMember })

    const response = await request(app).get('/').query({ fields: ['id', 'permissions'] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].permissions).toEqual(['C', 'R', 'U'])
  })
})
