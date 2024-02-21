const request = require('supertest')
const routes = require('./stream')
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
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, externalId: 1, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK46', name: 'Stream 2', projectId: PROJECT_2.id, externalId: 2, isPublic: true, createdById: seedValues.otherUserId }
const STREAMS = [STREAM_1, STREAM_2]

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
        project_external_id: 4
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
