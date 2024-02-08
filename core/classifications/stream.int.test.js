const request = require('supertest')
const routes = require('./stream')
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

beforeEach(async () => {
  console.warn = jest.fn()
  await commonSetup()
})

const CLASSIFICATION_1 = { id: 1, value: 'chainsaw', title: 'chainsaw', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2021-04-14T00:00:00.000Z' }
const CLASSIFICATION_2 = { id: 2, value: 'vehicle', title: 'vehicle', typeId: 1, sourceId: null, parent_id: null, source_external_id: null, created_at: '2021-04-14T00:00:00.000Z' }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2]

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', createdById: seedValues.primaryUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK44', name: 'Stream 2', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAMS = [STREAM_1, STREAM_2]

const ANNOTATION_1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', start: '2021-04-14T00:00:00.000Z', end: '2021-04-14T00:01:00.000Z', stream_id: STREAM_1.id, classification_id: CLASSIFICATION_1.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId }
const ANNOTATION_2 = { id: '11111111-2222-3333-4444-555555555555', start: '2021-04-14T00:02:00.000Z', end: '2021-04-14T00:03:00.000Z', stream_id: STREAM_2.id, classification_id: CLASSIFICATION_1.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId  }
const ANNOTATION_3 = { id: '11111111-2222-3333-4444-666666666666', start: '2021-04-14T00:03:00.000Z', end: '2021-04-14T00:04:00.000Z', stream_id: STREAM_2.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId  }
const ANNOTATIONS = [ANNOTATION_1, ANNOTATION_2, ANNOTATION_3]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Annotation.bulkCreate(ANNOTATIONS)
}

describe('GET /streams/:id/classifications', () => {
  describe('Valid', () => {
    test('1 output', async () => {

      const response = await request(app).get(`/${STREAM_1.id}/classifications`).query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
    })

    test('2 output', async () => {

      const response = await request(app).get(`/${STREAM_2.id}/classifications`).query()
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].title).toBe(CLASSIFICATION_1.title)
      expect(response.body[1].title).toBe(CLASSIFICATION_2.title)
    })
  })
  describe('Invalid', () => {
    test('Not found Stream', async () => {

      const response = await request(app).get(`/aaaaaaaaaaaa/classifications`).query()
  
      expect(response.statusCode).toBe(404)
    })
  })
})
