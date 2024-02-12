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

const CLASSIFIER_1 = { id: 1, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', createdById: seedValues.primaryUserId }
const PROJECTS = [PROJECT_1]

const STREAM_1 = { id: 'LilSjZJkRK43', name: 'Stream 1', projectId: PROJECT_1.id, createdById: seedValues.primaryUserId }
const STREAM_2 = { id: 'LilSjZJkRK46', name: 'Stream 2', projectId: PROJECT_1.id, isPublic: true, createdById: seedValues.primaryUserId }
const STREAMS = [STREAM_1, STREAM_2]

const DETECTION_1 = { streamId: STREAM_1.id, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, start: '2021-05-11T00:05:00.000Z', end: '2021-05-11T00:05:05.000Z', confidence: 0.95 }
const DETECTION_2 = { streamId: STREAM_1.id, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, start: '2021-05-11T00:05:05.000Z', end: '2021-05-11T00:05:10.000Z', confidence: 0.6 }
const DETECTION_3 = { streamId: STREAM_1.id, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, start: '2021-05-11T00:05:10.000Z', end: '2021-05-11T00:05:15.000Z', confidence: 0.7 }
const DETECTION_4 = { streamId: STREAM_2.id, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, start: '2021-05-11T00:05:15.000Z', end: '2021-05-11T00:05:20.000Z', confidence: 0.99 }
const DETECTIONS = [DETECTION_1, DETECTION_2, DETECTION_3, DETECTION_4]

async function commonSetup () {
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.Stream.bulkCreate(STREAMS)
  await models.Classification.bulkCreate(CLASSIFICATIONS)
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.Detection.bulkCreate(DETECTIONS)
}

describe('GET /clustered-detections', () => {
  describe('Valid', () => {
    test('with [`start`, `end`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_3.end
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].first_start).toBe(DETECTION_1.start)
    })

    test('with [`start`, `end`, `min_confidence`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_3.end,
        min_confidence: 0.6
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(3)
      expect(response.body[0].first_start).toBe(DETECTION_1.start)
    })

    test('with [`start`, `end`, `streams`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        streams: [STREAM_2.id]
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].first_start).toBe(DETECTION_4.start)
    })

    test('with [`start`, `end`, `streams`, `min_confidence`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        streams: [STREAM_1.id],
        min_confidence: 0.6
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(3)
      expect(response.body[0].first_start).toBe(DETECTION_1.start)
    })

    test('with [`start`, `end`, `streams_public(false)`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        streams_public: false
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].first_start).toBe(DETECTION_1.start)
      expect(response.body[0].last_start).toBe(DETECTION_1.start)
      expect(response.body[1].first_start).toBe(DETECTION_4.start)
      expect(response.body[1].last_start).toBe(DETECTION_4.start)
    })

    test('with [`start`, `end`, `streams_public(true)`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        streams_public: true
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].first_start).toBe(DETECTION_4.start)
    })

    test('with [`start`, `end`, `classifications(chainsaw)`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        classifications: ['chainsaw']
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
    })

    test('with [`start`, `end`, `classifications(vehicle)`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        classifications: ['vehicle']
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(1)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_2.value)
    })

    test('with [`start`, `end`, `classifications(chainsaw, vehicle)`] params', async () => {
      const params = {
        start: DETECTION_1.start,
        end: DETECTION_4.end,
        classifications: ['vehicle', 'chainsaw']
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(200)
      expect(response.body.length).toBe(2)
      expect(response.body[0].aggregated_value).toBe(1)
      expect(response.body[0].classification.value).toBe(CLASSIFICATION_1.value)
      expect(response.body[1].aggregated_value).toBe(1)
      expect(response.body[1].classification.value).toBe(CLASSIFICATION_2.value)
    })
  })
  describe('Invalid', () => {
    test('Invalid Params', async () => {
      const params = {
        start: DETECTION_1.start
      }

      const response = await request(app).get('/').query(params)

      expect(response.statusCode).toBe(400)
    })
  })
})
