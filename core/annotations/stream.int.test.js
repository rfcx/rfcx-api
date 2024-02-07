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
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK44', name: 'Stream 2', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAM_3 = { id: 'LilSjZJkRK45', name: 'Stream 3', projectId: PROJECT_2.id, createdById: seedValues.otherUserId }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3]

const ANNOTATION_1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', start: '2021-04-14T00:00:00.000Z', end: '2021-04-14T00:01:00.000Z', stream_id: STREAM_1.id, classification_id: CLASSIFICATION_1.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId }
const ANNOTATION_1_1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff', start: '2021-04-14T00:01:00.000Z', end: '2021-04-14T00:02:00.000Z', stream_id: STREAM_1.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId }
const ANNOTATION_2 = { id: '11111111-2222-3333-4444-555555555555', start: '2021-04-14T00:02:00.000Z', end: '2021-04-14T00:03:00.000Z', stream_id: STREAM_2.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId  }
const ANNOTATION_3 = { id: '11111111-2222-3333-4444-666666666666', start: '2021-04-14T00:03:00.000Z', end: '2021-04-14T00:04:00.000Z', stream_id: STREAM_3.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId  }
const ANNOTATIONS = [ANNOTATION_1, ANNOTATION_1_1, ANNOTATION_2, ANNOTATION_3]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Annotation.bulkCreate(ANNOTATIONS)
}

describe('GET /streams/:id/annotations', () => {
  describe('Valid', () => {
    test('with [`start`, `end`] params 1 output', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_1.end
      }
      
      const response = await request(app).get(`/${ANNOTATION_1.stream_id}/annotations`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].id).toBe(ANNOTATION_1.id)
      expect(response.body[0].stream_id).toBe(ANNOTATION_1.stream_id)
      expect(response.body[0].start).toBe(ANNOTATION_1.start)
      expect(response.body[0].end).toBe(ANNOTATION_1.end)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
    })

    test('with [`start`, `end`] params 2 output', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_1_1.end
      }
      
      const response = await request(app).get(`/${ANNOTATION_1.stream_id}/annotations`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].id).toBe(ANNOTATION_1.id)
      expect(response.body[0].stream_id).toBe(ANNOTATION_1.stream_id)
      expect(response.body[0].start).toBe(ANNOTATION_1.start)
      expect(response.body[0].end).toBe(ANNOTATION_1.end)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[1].id).toBe(ANNOTATION_1_1.id)
      expect(response.body[1].stream_id).toBe(ANNOTATION_1_1.stream_id)
      expect(response.body[1].start).toBe(ANNOTATION_1_1.start)
      expect(response.body[1].end).toBe(ANNOTATION_1_1.end)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
    })

    test('with [`start`, `end`, `classifications`] params 1 outout', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_1_1.end,
        classifications: ['vehicle']
      }
      
      const response = await request(app).get(`/${ANNOTATION_1.stream_id}/annotations`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].id).toBe(ANNOTATION_1_1.id)
      expect(response.body[0].stream_id).toBe(ANNOTATION_1_1.stream_id)
      expect(response.body[0].start).toBe(ANNOTATION_1_1.start)
      expect(response.body[0].end).toBe(ANNOTATION_1_1.end)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_2.value)
    })

    test('with [`start`, `end`, `classifications`] params 2 output', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_1_1.end,
        classifications: ['vehicle', 'chainsaw']
      }
      
      const response = await request(app).get(`/${ANNOTATION_1.stream_id}/annotations`).query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].id).toBe(ANNOTATION_1.id)
      expect(response.body[0].stream_id).toBe(ANNOTATION_1.stream_id)
      expect(response.body[0].start).toBe(ANNOTATION_1.start)
      expect(response.body[0].end).toBe(ANNOTATION_1.end)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[1].id).toBe(ANNOTATION_1_1.id)
      expect(response.body[1].stream_id).toBe(ANNOTATION_1_1.stream_id)
      expect(response.body[1].start).toBe(ANNOTATION_1_1.start)
      expect(response.body[1].end).toBe(ANNOTATION_1_1.end)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const params = {
        start: ANNOTATION_1.start,
      }
      
      const response = await request(app).get(`/${ANNOTATION_1.stream_id}/annotations`).query(params)
  
      expect(response.statusCode).toBe(400)
    })

    test('Not found Stream', async () => {
      const params = {
        start: ANNOTATION_1.start,
      }
      
      const response = await request(app).get(`/aaaaaaaaaaaa/annotations`).query(params)
  
      expect(response.statusCode).toBe(404)
    })
  })
})