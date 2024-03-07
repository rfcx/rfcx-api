const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

describe('GET /streams', () => {
  test('no results', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(stream.id)
    expect(response.body[0].name).toBe(stream.name)
    expect(response.body[0].latitude).toBe(stream.latitude)
  })

  test('multiple results', async () => {
    await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })
    await models.Stream.create({ id: 'guard3', name: 'GU03', latitude: 10.3, longitude: 101.3, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
  })

  test('sorted results', async () => {
    const stream1 = await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const stream2 = await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/').query({ sort: 'updated_at' })

    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(stream1.id)
    expect(response.body[1].id).toBe(stream2.id)
  })

  test('reverse sorted results', async () => {
    const stream1 = await models.Stream.create({ id: 'guard1', name: 'GU01', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    await new Promise(resolve => setTimeout(resolve, 10)) // Force the updated at to not be the same
    const stream2 = await models.Stream.create({ id: 'guard2', name: 'GU02', latitude: 10.2, longitude: 101.2, createdById: seedValues.primaryUserId })

    const response = await request(app).get('/').query({ sort: '-updated_at' })

    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(stream2.id)
    expect(response.body[1].id).toBe(stream1.id)
  })

  test('results do not include private streams from others', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(0)
  })

  test('results do not include public streams from others', async () => {
    const stream = { id: 'x456y', isPublic: true, createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(0)
  })

  test('results include public streams from me', async () => {
    const stream = { id: 'x456y', isPublic: true, createdById: seedValues.primaryUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include only public streams using only_public', async () => {
    await models.Stream.create({ id: 'public1', createdById: seedValues.otherUserId, isPublic: true, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'private2', createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })

    const response = await request(app).get('/').query({ only_public: true })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('public1')
  })

  test('results include stream guest', async () => {
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, name: 'Jaguar Station' }
    await models.Stream.create(stream)
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: stream.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include project guest', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include organization guest', async () => {
    const organization = { id: 'o789o', createdById: seedValues.otherUserId, name: 'Other Org' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, organization_id: organization.id, name: 'Other Project' }
    const stream = { id: 'x456y', createdById: seedValues.otherUserId, project_id: project.id, name: 'Jaguar Station' }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create(stream)
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('results include everything for super user', async () => {
    const superUserApp = expressApp({ is_super: true })
    superUserApp.use('/', routes)
    await models.Stream.create({ id: 'guard1', createdById: seedValues.primaryUserId, name: 'GU01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'guard2', createdById: seedValues.otherUserId, name: 'GU02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 'guard3', createdById: seedValues.otherUserId, name: 'GU03', latitude: 10.3, longitude: 101.3 })

    const response = await request(superUserApp).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
  })

  test('results include everything for system user', async () => {
    const systemUserApp = expressApp({ has_system_role: true })
    systemUserApp.use('/', routes)
    await models.Stream.create({ id: 'guard1', createdById: seedValues.primaryUserId, name: 'GU01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'guard2', createdById: seedValues.otherUserId, name: 'GU02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 'guard3', createdById: seedValues.otherUserId, name: 'GU03', latitude: 10.3, longitude: 101.3 })

    const response = await request(systemUserApp).get('/')

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
  })

  test('results include only hidden streams using hidden', async () => {
    await models.Stream.create({ id: 'public1', createdById: seedValues.primaryUserId, isPublic: true, name: 'AB01', latitude: 10.1, longitude: 101.1, hidden: true })
    await models.Stream.create({ id: 'private2', createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2, hidden: false })

    const response = await request(app).get('/').query({ hidden: true })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('public1')
  })

  test('filter by name without *', async () => {
    await models.Stream.create({ name: 'cherry creek', createdById: seedValues.primaryUserId, id: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ name: 'jacobs creek', createdById: seedValues.primaryUserId, id: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ name: 'cherry orchard', createdById: seedValues.primaryUserId, id: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ name: 'cherry creek' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].name).toEqual('cherry creek')
  })

  test('filter by name with * at the beginning', async () => {
    await models.Stream.create({ name: 'cherry creek', createdById: seedValues.primaryUserId, id: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ name: 'jacobs creek', createdById: seedValues.primaryUserId, id: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ name: 'cherry orchard', createdById: seedValues.primaryUserId, id: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ name: '*creek' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].name).toEqual(expect.stringContaining('creek'))
    expect(response.body[1].name).toEqual(expect.stringContaining('creek'))
  })

  test('filter by name with * at the end', async () => {
    await models.Stream.create({ name: 'cherry creek', createdById: seedValues.primaryUserId, id: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ name: 'jacobs creek', createdById: seedValues.primaryUserId, id: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ name: 'cherry orchard', createdById: seedValues.primaryUserId, id: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ name: 'cherry*' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].name).toEqual(expect.stringContaining('cherry'))
    expect(response.body[1].name).toEqual(expect.stringContaining('cherry'))
  })

  test('filter by name with * in between', async () => {
    await models.Stream.create({ name: 'cherry creek', createdById: seedValues.primaryUserId, id: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ name: 'jacobs creek', createdById: seedValues.primaryUserId, id: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ name: 'cherry orchard', createdById: seedValues.primaryUserId, id: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ name: '*cobs*' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].name).toEqual('jacobs creek')
  })

  test('filter by keyword', async () => {
    await models.Stream.create({ name: 'cherry creek', createdById: seedValues.primaryUserId, id: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ name: 'jacobs creek', createdById: seedValues.primaryUserId, id: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ name: 'cherry orchard', createdById: seedValues.primaryUserId, id: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ keyword: 'creek' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].name).toEqual(expect.stringContaining('creek'))
    expect(response.body[1].name).toEqual(expect.stringContaining('creek'))
  })

  test('filter by project', async () => {
    const project1 = { id: 'pq1', createdById: seedValues.primaryUserId, name: 'PQ1' }
    const project2 = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
    await models.Project.create(project1)
    await models.Project.create(project2)
    await models.Stream.create({ id: 'ab1', projectId: project1.id, createdById: seedValues.primaryUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'ab2', projectId: project2.id, createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 'ab3', createdById: seedValues.primaryUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ projects: project2.id })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('ab2')
  })

  test('filter by multiple projects', async () => {
    const project1 = { id: 'pq1', createdById: seedValues.primaryUserId, name: 'PQ1' }
    const project2 = { id: 'pq2', createdById: seedValues.primaryUserId, name: 'PQ2' }
    await models.Project.create(project1)
    await models.Project.create(project2)
    await models.Stream.create({ id: 'ab1', projectId: project1.id, createdById: seedValues.primaryUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'ab2', projectId: project2.id, createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 'ab3', createdById: seedValues.primaryUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })

    const response = await request(app).get('/').query({ projects: [project1.id, project2.id] })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body.map(p => p.id).sort()).toEqual(['ab1', 'ab2'])
  })

  test('filter by created by', async () => {
    await models.Stream.create({ id: 'public1', createdById: seedValues.otherUserId, isPublic: true, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 'public2', createdById: seedValues.primaryUserId, isPublic: true, name: 'AB02', latitude: 10.2, longitude: 101.2 })

    const response = await request(app).get('/').query({ only_public: true, created_by: seedValues.otherUserGuid })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('public1')
  })

  test('filter by updated after', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.primaryUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.primaryUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.sequelize.query('UPDATE streams SET updated_at = \'2020-12-01 00:10:20\' WHERE id = \'s1\'')

    const response = await request(app).get('/').query({ updated_after: '2021-01-01T00:00:00Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('s2')
  })

  test('filter by C permission', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4 })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'C' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
  })

  test('filter by R permission', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4 })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'R' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s1')).toBeTruthy()
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
  })

  test('filter by R permission when other user has role too', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4 })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.anotherUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'R' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s1')).toBeTruthy()
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
  })

  test('filter by R permission based on a project', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project' }
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/').query({ permission: 'R' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(4)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s1')).toBeTruthy()
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('filter by R permission based on organization', async () => {
    const organization = { id: 'o123o', createdById: seedValues.otherUserId, name: 'Other User Organization' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project', organizationId: organization.id }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleGuest })

    const response = await request(app).get('/').query({ permission: 'R' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(4)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s1')).toBeTruthy()
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('filter by U permission', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4 })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'U' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
  })

  test('filter by U permission based on a project', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project' }
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })

    const response = await request(app).get('/').query({ permission: 'U' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('filter by U permission based on organization', async () => {
    const organization = { id: 'o123o', createdById: seedValues.otherUserId, name: 'Other User Organization' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project', organizationId: organization.id }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleMember })

    const response = await request(app).get('/').query({ permission: 'U' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s2')).toBeTruthy()
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('filter by D permission', async () => {
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4 })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'D' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe('s3')
  })

  test('filter by D permission based on a project', async () => {
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project' }
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'D' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('filter by D permission based on organization', async () => {
    const organization = { id: 'o123o', createdById: seedValues.otherUserId, name: 'Other User Organization' }
    const project = { id: 'p123p', createdById: seedValues.otherUserId, name: 'Other User Project', organizationId: organization.id }
    await models.Organization.create(organization)
    await models.Project.create(project)
    await models.Stream.create({ id: 's1', createdById: seedValues.otherUserId, name: 'AB01', latitude: 10.1, longitude: 101.1 })
    await models.Stream.create({ id: 's2', createdById: seedValues.otherUserId, name: 'AB02', latitude: 10.2, longitude: 101.2 })
    await models.Stream.create({ id: 's3', createdById: seedValues.otherUserId, name: 'AB03', latitude: 10.3, longitude: 101.3 })
    await models.Stream.create({ id: 's4', createdById: seedValues.otherUserId, name: 'AB04', latitude: 10.4, longitude: 101.4, projectId: project.id })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's1', role_id: seedValues.roleGuest })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's2', role_id: seedValues.roleMember })
    await models.UserStreamRole.create({ user_id: seedValues.primaryUserId, stream_id: 's3', role_id: seedValues.roleAdmin })
    await models.UserOrganizationRole.create({ user_id: seedValues.primaryUserId, organization_id: organization.id, role_id: seedValues.roleAdmin })

    const response = await request(app).get('/').query({ permission: 'D' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    const ids = response.body.map(b => b.id)
    expect(ids.includes('s3')).toBeTruthy()
    expect(ids.includes('s4')).toBeTruthy()
  })

  test('respond with 400 error if permission has invalid value', async () => {
    const response = await request(app).get('/').query({ permission: 'Q' })

    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Validation errors: Parameter \'permission\' should be one of these values: C, R, U, D.')
  })

  test('country name works correct for stream coordinates', async () => {
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, timezone: 'Europe/Britain', countryCode: 'GB' }
    await models.Stream.create(stream)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    const body = response.body[0]
    expect(response.statusCode).toBe(200)
    expect(body.id).toBe(stream.id)
    expect(body.latitude).toBe(stream.latitude)
    expect(body.longitude).toBe(stream.longitude)
  })
})
