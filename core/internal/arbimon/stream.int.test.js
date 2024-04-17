const request = require('supertest')
const routes = require('./stream')
const googleMap = require('../../_services/google')
const models = require('../../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../../common/testing/sequelize')

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

beforeEach(async () => {
  console.warn = jest.fn()
  await commonSetup()
})

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', externalId: 1, createdById: seedValues.primaryUserId }
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', externalId: 2, createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testproj0003', name: 'Test project 3', externalId: 3, createdById: seedValues.primaryUserId }
const PROJECT_4 = { id: 'testproj0004', name: 'Test project 4', externalId: 4, createdById: seedValues.primaryUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3, PROJECT_4]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, externalId: 1, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK46', name: 'Stream 2', projectId: PROJECT_2.id, externalId: 2, isPublic: true, createdById: seedValues.otherUserId }
const STREAM_3 = { id: 'LilSjZJkRK49', name: 'Stream 3', projectId: PROJECT_4.id, externalId: 3, latitude: 10, longitude: 103, createdById: seedValues.primaryUserId, countryCode: 'TH', timezone: 'Asia/Bangkok' }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
}

describe('PATCH /internal/arbimon/streams/:externalId', () => {
  describe('Valid', () => {
    test('with [`name`] params', async () => {
      const body = {
        name: 'New Stream 1'
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
    })

    test('with [`name`] params should not change timezone and country code', async () => {
      const body = {
        name: 'New Stream 3'
      }

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(STREAM_3.latitude)
      expect(stream.longitude).toBe(STREAM_3.longitude)
      expect(stream.timezone).toBe(STREAM_3.timezone)
      expect(stream.countryCode).toBe(STREAM_3.countryCode)
    })

    test('with [`name`, `latitude` = undefined, `longitude` = undefined] params should not change timezone and country code', async () => {
      const body = {
        name: 'New Stream 3',
        latitude: undefined,
        longitude: undefined
      }

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(STREAM_3.latitude)
      expect(stream.longitude).toBe(STREAM_3.longitude)
      expect(stream.timezone).toBe(STREAM_3.timezone)
      expect(stream.countryCode).toBe(STREAM_3.countryCode)
    })

    test('with [`name`, `latitude` = 0, `longitude` = 0] params should change timezone and country code to default values', async () => {
      const body = {
        name: 'New Stream 3',
        latitude: 0,
        longitude: 0
      }

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBeNull()
      expect(stream.longitude).toBeNull()
      expect(stream.timezone).toBe('UTC')
      expect(stream.countryCode).toBeNull()
    })

    test('with [`name`, `latitude`, `longitude` = null] params should change timezone and country code to default values', async () => {
      const body = {
        name: 'New Stream 3',
        latitude: 10.1,
        longitude: null
      }

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(body.latitude)
      expect(stream.longitude).toBeNull()
      expect(stream.timezone).toBe('UTC')
      expect(stream.countryCode).toBeNull()
    })

    test('with [`name`, `latitude`= null, `longitude` = null] params should change timezone and country code to default values', async () => {
      const body = {
        name: 'New Stream 3',
        latitude: null,
        longitude: null
      }

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBeNull()
      expect(stream.longitude).toBeNull()
      expect(stream.timezone).toBe('UTC')
      expect(stream.countryCode).toBeNull()
    })

    test('with [`name`, `latitude`, `longitude`] params should change timezone and country code correctly', async () => {
      const body = {
        name: 'New Stream 3',
        longitude: 111
      }
      const mockCountry = jest.spyOn(googleMap, 'getCountry')
      mockCountry.mockReturnValueOnce({
        data: {
          results: [{
            address_components: [{
              short_name: 'MY'
            }]
          }]
        }
      })
      const mockTimezone = jest.spyOn(googleMap, 'getTimezone')
      mockTimezone.mockReturnValueOnce({
        data: {
          timeZoneId: 'Asia/Myanmar'
        }
      })

      const response = await request(app).patch(`/streams/${STREAM_3.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_3.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(STREAM_3.latitude)
      expect(stream.longitude).toBe(body.longitude)
      expect(stream.timezone).toBe('Asia/Myanmar')
      expect(stream.countryCode).toBe('MY')
    })

    test('with [`name`, `latitude`] params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(body.latitude)
      const projectAfterUpdated = await models.Project.findByPk(PROJECT_1.id)
      expect(projectAfterUpdated.minLatitude).toBeNull()
      expect(projectAfterUpdated.maxLatitude).toBeNull()
      expect(projectAfterUpdated.minLongitude).toBeNull()
      expect(projectAfterUpdated.maxLongitude).toBeNull()
    })

    test('with [`name`, `latitude`, `project_external_id`] params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9,
        project_external_id: PROJECT_3.externalId
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(body.latitude)
      expect(stream.project_id).toBe(PROJECT_3.id)
      const projectAfterUpdated = await models.Project.findByPk(PROJECT_1.id)
      expect(projectAfterUpdated.minLatitude).toBeNull()
      expect(projectAfterUpdated.maxLatitude).toBeNull()
      expect(projectAfterUpdated.minLongitude).toBeNull()
      expect(projectAfterUpdated.maxLongitude).toBeNull()
    })

    test('with [`name`, `latitude`, `longitude`] params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9,
        longitude: 10.9
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

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBe(body.latitude)
      expect(stream.project_id).toBe(PROJECT_1.id)
      const projectAfterUpdated = await models.Project.findByPk(PROJECT_1.id)
      expect(projectAfterUpdated.minLatitude).toBe(body.latitude)
      expect(projectAfterUpdated.maxLatitude).toBe(body.latitude)
      expect(projectAfterUpdated.minLongitude).toBe(body.longitude)
      expect(projectAfterUpdated.maxLongitude).toBe(body.longitude)
    })

    test('with [`name`, `latitude=0`, `longitude=0`] params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 0,
        longitude: 0
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBeNull()
      expect(stream.longitude).toBeNull()
      expect(stream.project_id).toBe(PROJECT_1.id)
      const projectAfterUpdated = await models.Project.findByPk(PROJECT_1.id)
      expect(projectAfterUpdated.minLatitude).toBeNull()
      expect(projectAfterUpdated.maxLatitude).toBeNull()
      expect(projectAfterUpdated.minLongitude).toBeNull()
      expect(projectAfterUpdated.maxLongitude).toBeNull()
    })

    test('with [`name`, `latitude=0`, `longitude=19`] params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 0,
        longitude: 19
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(200)
      const stream = await models.Stream.findByPk(STREAM_1.id)
      expect(stream.name).toBe(body.name)
      expect(stream.latitude).toBeNull()
      expect(stream.project_id).toBe(PROJECT_1.id)
      const projectAfterUpdated = await models.Project.findByPk(PROJECT_1.id)
      expect(projectAfterUpdated.minLatitude).toBeNull()
      expect(projectAfterUpdated.maxLatitude).toBeNull()
      expect(projectAfterUpdated.minLongitude).toBeNull()
      expect(projectAfterUpdated.maxLongitude).toBeNull()
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 'abc'
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(400)
    })

    test('Not found Stream', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9
      }

      const response = await request(app).patch('/streams/123').send(body)

      expect(response.statusCode).toBe(404)
    })

    test('Not found external project id', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9,
        project_external_id: 5
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(404)
    })

    test('Forbidden Stream', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9
      }

      const response = await request(app).patch(`/streams/${STREAM_2.externalId}`).send(body)

      expect(response.statusCode).toBe(403)
    })

    test('Forbidden Project', async () => {
      const body = {
        name: 'New Stream 1',
        latitude: 19.9,
        project_external_id: PROJECT_2.externalId
      }

      const response = await request(app).patch(`/streams/${STREAM_1.externalId}`).send(body)

      expect(response.statusCode).toBe(403)
    })
  })
})
