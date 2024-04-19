const arbimonService = require('../_services/arbimon')
const googleMap = require('../_services/google')
const routes = require('.')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')

jest.mock('../_services/arbimon', () => {
  return {
    isEnabled: true,
    createSite: jest.fn(async () => { return await Promise.resolve({ site_id: 123 }) })
  }
})

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

describe('POST /streams', () => {
  test('missing name', async () => {
    const requestBody = {
      latitude: 10.123
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })

  test('arbimon failed creating a site', async () => {
    arbimonService.createSite.mockImplementationOnce(() => { throw new Error() })
    const requestBody = {
      name: 'Trail 39',
      latitude: 10.123,
      longitude: 101.456
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(500)
    const streams = await models.Stream.findAll({ where: { name: 'Trail 39' } })
    expect(streams.length).toBe(0)
  })

  test('required fields only', async () => {
    const requestBody = {
      name: 'Trail 39',
      latitude: 10.123,
      longitude: 101.456
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.header.location).toMatch(/^\/streams\/[0-9a-z]+$/)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
    expect(stream.createdById).toBe(seedValues.primaryUserId)
    expect(stream.timezone).toBe('Etc/GMT-7')
    expect(stream.externalId).toBe(123)
  })

  test('returns 201 when user creates a stream in a project he has a Member role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleMember })
    const requestBody = {
      name: 'Trail 40',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
    expect(stream.createdById).toBe(seedValues.primaryUserId)
  })
  test('returns 201 when user creates a stream in a project he has an Admin role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const requestBody = {
      name: 'Trail 41',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
    expect(stream.createdById).toBe(seedValues.primaryUserId)
  })
  test('returns 403 when user creates a stream in a project he has only a Guest role', async () => {
    const project = { id: 'foo', name: 'not my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleGuest })
    const requestBody = {
      name: 'Trail 42',
      latitude: 10.123,
      longitude: 101.456,
      project_id: 'foo'
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(403)
  })
  test('returns 201 with timezone value', async () => {
    const project = { id: 'foo', name: 'my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const requestBody = {
      name: 'Trail 43',
      latitude: 15,
      longitude: 100,
      project_id: 'foo'
    }
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {
        timeZoneId: 'Asia/Bangkok'
      }
    })

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.timezone).toBe('Asia/Bangkok')
  })
  test('returns 201 with null latitude and longitude cause UTC timezone value', async () => {
    const project = { id: 'foo', name: 'my project', createdById: seedValues.otherUserId }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })

    const requestBody = {
      name: 'Trail 44',
      latitude: null,
      longitude: null,
      project_id: 'foo'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.timezone).toBe('UTC')
  })

  test('returns 201 when defined id in request body', async () => {
    const definedId = 'abcdef123456'
    const requestBody = {
      id: definedId,
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe(definedId)
  })

  test('returns 201 when latitude 0 and longitude 0 in request body, latitude and longitude to null', async () => {
    const requestBody = {
      name: 'test-stream-with-id',
      latitude: 0,
      longitude: 0
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.latitude).toBeNull()
    expect(stream.longitude).toBeNull()
  })

  test('returns 201 when longitude 0 in request body, longitude to null', async () => {
    const requestBody = {
      name: 'test-stream-with-id',
      latitude: 20,
      longitude: 0
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.latitude).toBe(requestBody.latitude)
    expect(stream.longitude).toBeNull()
  })

  test('returns 201 when latitude 0 in request body, latitude to null', async () => {
    const requestBody = {
      name: 'test-stream-with-id',
      latitude: 0,
      longitude: 19
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.latitude).toBeNull()
    expect(stream.longitude).toBe(requestBody.longitude)
  })

  test('returns 201 when hidden in request body', async () => {
    const requestBody = {
      name: 'test-stream-with-id',
      hidden: true
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.hidden).toBe(requestBody.hidden)
  })

  test('returns 400 when id length less than minimum(12)', async () => {
    const requestBody = {
      id: 'abcdef12345',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id length more than minimum(12)', async () => {
    const requestBody = {
      id: 'abcdef1234567',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id has uppercase symbols', async () => {
    const requestBody = {
      id: 'ABcdef123456',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when id has special characters', async () => {
    const requestBody = {
      id: 'abcd-f123456',
      name: 'test-stream-with-id'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when user tries to create a stream with a duplicate name in the project', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'dqweqfwdw123', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = await models.Stream.create({ id: 'qwertyuiop10', name: 'my stream 1', createdById: seedValues.primaryUserId, project_id: project.id })

    const requestBody = {
      id: 'qwertyuiop11',
      name: stream.name,
      project_id: project.id
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
    expect(response.body.message).toBe('Duplicate stream name in the project')
  })

  test('creates a stream when user tries to create a stream with a duplicate name in a different project', async () => {
    const project1 = (await models.Project.findOrCreate({ where: { id: 'dqweqfwdw123', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
    const project2 = (await models.Project.findOrCreate({ where: { id: 'dqweqfwdw124', name: 'my project 2', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project1.id, role_id: seedValues.roleAdmin })
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project2.id, role_id: seedValues.roleAdmin })
    const stream = await models.Stream.create({ id: 'qwertyuiop10', name: 'my stream 1', createdById: seedValues.primaryUserId, project_id: project1.id })

    const requestBody = {
      id: 'qwertyuiop11',
      name: stream.name,
      project_id: project2.id
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('creates a stream when user tries to create a stream with a non-duplicate name in the project', async () => {
    const project = (await models.Project.findOrCreate({ where: { id: 'dqweqfwdw123', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    await models.Stream.create({ id: 'qwertyuiop10', name: 'my stream 1', createdById: seedValues.primaryUserId, project_id: project.id })

    const requestBody = {
      id: 'qwertyuiop11',
      name: 'my stream 2',
      project_id: project.id
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('country code works well for a new stream', async () => {
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: [{
          address_components: [{
            short_name: 'IM'
          }]
        }]
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: 54.2, longitude: -4.5 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.countryCode).toBe('IM')
  })

  test('country code is null and timezone is UTC for undefined lat', async () => {
    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: undefined, longitude: -4.5 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.timezone).toBe('UTC')
    expect(stream.countryCode).toBe(null)
  })

  test('country code is null and timezone is UTC for null lat', async () => {
    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: null, longitude: -4.5 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.timezone).toBe('UTC')
    expect(stream.countryCode).toBe(null)
  })

  test('country code is null and timezone is UTC for null lat long', async () => {
    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: null, longitude: null })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.timezone).toBe('UTC')
    expect(stream.countryCode).toBe(null)
  })

  test('country code is null and timezone is UTC for 0 lat long', async () => {
    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: 0, longitude: 0 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.timezone).toBe('UTC')
    expect(stream.countryCode).toBe(null)
  })

  test('country code is null and timezone is UTC for 0 lat', async () => {
    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: 0, longitude: -4.5 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.timezone).toBe('UTC')
    expect(stream.countryCode).toBe(null)
  })

  test('country code is null for coordinates in the ocean', async () => {
    const mockCountry = jest.spyOn(googleMap, 'getCountry')
    mockCountry.mockReturnValueOnce({
      data: {
        results: []
      }
    })
    const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
    mockTimezone.mockReturnValueOnce({
      data: {}
    })

    const response = await request(app).post('/').send({ id: 'qwertyuiop40', name: 'my stream 4', latitude: 40, longitude: -40 })

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.id).toBe('qwertyuiop40')
    expect(stream.countryCode).toBe(null)
  })

  test('min/max latitude/longitude of project change when add stream', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    await models.Stream.create(stream)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.maxLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.minLongitude).toBe(stream.longitude)
    expect(projectAfterCreated.maxLongitude).toBe(stream.longitude)
  })

  test('min/max latitude/longitude of project change when add 2 stream', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.maxLatitude).toBe(stream2.latitude)
    expect(projectAfterCreated.minLongitude).toBe(stream2.longitude)
    expect(projectAfterCreated.maxLongitude).toBe(stream.longitude)
  })

  test('min/max latitude/longitude of project change when add 2 stream with 1 hidden', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id, hidden: true }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.maxLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.minLongitude).toBe(stream.longitude)
    expect(projectAfterCreated.maxLongitude).toBe(stream.longitude)
  })

  test('min/max latitude/longitude of project change when add 2 stream with 2 hidden', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id, hidden: true }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: 66.2, longitude: -10.5, projectId: project.id, hidden: true }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBeNull()
    expect(projectAfterCreated.maxLatitude).toBeNull()
    expect(projectAfterCreated.minLongitude).toBeNull()
    expect(projectAfterCreated.maxLongitude).toBeNull()
  })

  test('min/max latitude/longitude of project change when add stream with null latitude', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: null, longitude: -4.5, projectId: project.id }
    await models.Stream.create(stream)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBeNull()
    expect(projectAfterCreated.maxLatitude).toBeNull()
    expect(projectAfterCreated.minLongitude).toBeNull()
    expect(projectAfterCreated.maxLongitude).toBeNull()
  })

  test('min/max latitude/longitude of project change when add 2 stream with 1 null latitude', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar Station', latitude: 54.2, longitude: -4.5, projectId: project.id }
    const stream2 = { id: 'jagu2', createdById: seedValues.primaryUserId, name: 'Jaguar Station 2', latitude: null, longitude: -10.5, projectId: project.id }
    await models.Stream.create(stream)
    await models.Stream.create(stream2)

    const response = await request(app).get('/').query({ name: 'Jaguar Station' })

    expect(response.statusCode).toBe(200)
    const projectAfterCreated = await models.Project.findByPk(project.id)
    expect(projectAfterCreated.minLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.maxLatitude).toBe(stream.latitude)
    expect(projectAfterCreated.minLongitude).toBe(stream.longitude)
    expect(projectAfterCreated.maxLongitude).toBe(stream.longitude)
  })

  test('Can create site with similar name (hyphen to underscore)', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream1 = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar-Station', latitude: null, longitude: -4.5, projectId: project.id }
    await models.Stream.create(stream1)

    const requestBody = {
      name: 'Jaguar_Station',
      project_id: project.id
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
  })

  test('Can create site with similar name (2 hyphen to 1 underscore)', async () => {
    const project = { id: 'p123p', createdById: seedValues.primaryUserId, name: 'Primary User Project' }
    await models.Project.create(project)
    await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: project.id, role_id: seedValues.roleAdmin })
    const stream1 = { id: 'jagu1', createdById: seedValues.primaryUserId, name: 'Jaguar-Station-1', latitude: null, longitude: -4.5, projectId: project.id }
    await models.Stream.create(stream1)

    const requestBody = {
      name: 'Jaguar_Station-1',
      project_id: project.id
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    const id = response.header.location.replace('/streams/', '')
    const stream = await models.Stream.findByPk(id)
    expect(stream.name).toBe(requestBody.name)
  })
})
