const request = require('supertest')
const routes = require('./clustered')
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
const STREAM_3 = { id: 'LilSjZJkRK45', name: 'Stream 3', projectId: PROJECT_2.id, isPublic: true, createdById: seedValues.otherUserId }
const STREAM_4 = { id: 'LilSjZJkRK46', name: 'Stream 4', projectId: PROJECT_1.id, isPublic: true, createdById: seedValues.primaryUserId }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3, STREAM_4]

const ANNOTATION_1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', start: '2021-04-14T00:00:00.000Z', end: '2021-04-14T00:01:00.000Z', stream_id: STREAM_1.id, classification_id: CLASSIFICATION_1.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId }
const ANNOTATION_2 = { id: '11111111-2222-3333-4444-555555555555', start: '2021-04-14T00:02:00.000Z', end: '2021-04-14T00:03:00.000Z', stream_id: STREAM_2.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId  }
const ANNOTATION_3 = { id: '11111111-2222-3333-4444-666666666666', start: '2021-04-14T00:03:00.000Z', end: '2021-04-14T00:04:00.000Z', stream_id: STREAM_3.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId  }
const ANNOTATION_4 = { id: '11111111-2222-3333-4444-777777777777', start: '2021-04-14T00:04:00.000Z', end: '2021-04-14T00:05:00.000Z', stream_id: STREAM_4.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId  }
const ANNOTATION_5 = { id: '11111111-2222-3333-4444-888888888888', start: '2021-04-16T00:04:00.000Z', end: '2021-04-16T00:05:00.000Z', stream_id: STREAM_4.id, classification_id: CLASSIFICATION_2.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId  }
const ANNOTATIONS = [ANNOTATION_1, ANNOTATION_2, ANNOTATION_3, ANNOTATION_4, ANNOTATION_5]

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
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].first_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_1.title)
    })

    test('with [`start`, `end`] params 2 output', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_2.end
      }
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].first_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_1.title)
      expect(response.body[1].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[1].first_start).toBe(ANNOTATION_2.start)
      expect(response.body[1].last_start).toBe(ANNOTATION_2.start)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[1].classification.title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`start`, `end`, `stream_id`] params', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_2.end,
        stream_id: ANNOTATION_2.stream_id
      }
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].first_start).toBe(ANNOTATION_2.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_2.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`start`, `end`, `stream_public(false)`] params', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_4.end,
        streams_public: false
      }
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].first_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_1.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_1.title)
      expect(response.body[1].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[1].aggregated_value).toBe(2)
      expect(response.body[1].first_start).toBe(ANNOTATION_2.start)
      expect(response.body[1].last_start).toBe(ANNOTATION_4.start)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[1].classification.title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`start`, `end`, `stream_public(true)`] params', async () => {
      const params = {
        start: ANNOTATION_1.start,
        end: ANNOTATION_4.end,
        streams_public: true
      }
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].aggregated_value).toBe(2)
      expect(response.body[0].first_start).toBe(ANNOTATION_3.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_4.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_2.title)
    })

    test('with [`start`, `end`, `interval`] params', async () => {
      const params = {
        start: ANNOTATION_4.start,
        end: ANNOTATION_5.end,
        interval: '2d'
      }
      
      const response = await request(app).get('/').query(params)
  
      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].time_bucket).toBe(ANNOTATION_1.start)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].first_start).toBe(ANNOTATION_4.start)
      expect(response.body[0].last_start).toBe(ANNOTATION_4.start)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[0].classification.title).toBe(CLASSIFICATION_2.title)
      expect(response.body[1].time_bucket).toBe('2021-04-16T00:00:00.000Z')
      expect(response.body[1].aggregated_value).toBe(1)
      expect(response.body[1].first_start).toBe(ANNOTATION_5.start)
      expect(response.body[1].last_start).toBe(ANNOTATION_5.start)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
      expect(response.body[1].classification.title).toBe(CLASSIFICATION_2.title)
    })
  })
  describe('Invalid', () => {
    test('Invalid Param not enough required', async () => {
      const params = {
        start: ANNOTATION_4.start
      }
      
      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(400)
    })

    test('Not found Stream', async () => {
      const params = {
        start: ANNOTATION_4.start,
        end: ANNOTATION_4.end,
        stream_id: 'aaaaaaaaaaa'
      }
      
      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(404)
    })
  })
})