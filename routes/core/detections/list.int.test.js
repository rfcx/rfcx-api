const request = require('supertest')
const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../../utils/sequelize/testing')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  const project = { id: 'project1', name: 'my project 1', createdById: seedValues.primaryUserId }
  await models.Project.create(project)
  const project2 = { id: 'project2', name: 'my project 2', createdById: seedValues.primaryUserId }
  await models.Project.create(project2)
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId, project_id: project.id }
  await models.Stream.create(stream)
  const stream2 = { id: 'abc2', name: 'my stream 2', createdById: seedValues.primaryUserId, project_id: project2.id }
  await models.Stream.create(stream2)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classification2 = { id: 7, value: 'vehicle', title: 'Vehicle', type_id: 1, source_id: 1 }
  await models.Classification.create(classification2)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const classifier2 = { id: 4, externalId: 'dddfff', name: 'vehicle model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier2)
  const detections = [
    {
      id: 1,
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:00Z',
      end: '2021-05-11T00:05:05Z',
      confidence: 0.99,
      review_status: -1,
      reviews: [
        { user_id: seedValues.primaryUserId, positive: false }
      ]
    },
    {
      id: 2,
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:05Z',
      end: '2021-05-11T00:05:10Z',
      confidence: 0.98,
      review_status: 1,
      reviews: [
        { user_id: seedValues.primaryUserId, positive: true }
      ]
    },
    {
      id: 3,
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:15Z',
      end: '2021-05-11T00:05:20Z',
      confidence: 0.98,
      review_status: 0,
      reviews: []
    },
    {
      id: 4,
      stream_id: stream2.id,
      classifier_id: classifier2.id,
      classification_id: classification2.id,
      start: '2021-05-11T00:05:20Z',
      end: '2021-05-11T00:05:25Z',
      confidence: 0.98,
      review_status: -1,
      reviews: [
        { user_id: seedValues.primaryUserId, positive: false },
        { user_id: seedValues.otherUserId, positive: false },
        { user_id: seedValues.anotherUserId, positive: true }
      ]
    }
  ]
  for (const detection of detections) {
    await models.Detection.create(detection)
    for (const review of detection.reviews) {
      await models.DetectionReview.create({ ...review, detection_id: detection.id })
    }
  }
  return { stream, stream2, project, project2, classification, classification2, classifier, classifier2, detections }
}

describe('GET /detections', () => {
  test('detections with default fields', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:05:15.000Z'
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(1)
    expect(response.body[1].id).toBe(2)
    expect(Object.keys(response.body[0]).sort((a, b) => a.localeCompare(b))).toEqual(['confidence', 'end', 'id', 'review_status', 'start', 'stream_id'])
  })
  test('detections with default fields in descending order', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:05:15.000Z',
      descending: true
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body[0].id).toBe(2)
    expect(response.body[1].id).toBe(1)
  })
  test('detections filtered by stream', async () => {
    const { stream2 } = await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      streams: [stream2.id]
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(4)
  })
  test('detections filtered by project', async () => {
    const { project2 } = await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      projects: [project2.id]
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(4)
  })
  test('detections filtered by classifiers', async () => {
    const { classifier2 } = await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      classifiers: [classifier2.id]
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(4)
  })
  test('detections filtered by classifications', async () => {
    const { classification2 } = await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      classifications: [classification2.value]
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(4)
  })
  test('detections filtered by min_confidence', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      min_confidence: 0.99
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(1)
  })
  test('detections filtered by is_reviewed === false', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      is_reviewed: false
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(3)
  })
  test('detections filtered by is_reviewed === true', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      is_reviewed: true
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    expect(response.body[0].id).toBe(1)
    expect(response.body[1].id).toBe(2)
    expect(response.body[2].id).toBe(4)
  })
  test('detections filtered by is_positive === false', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      is_positive: false
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].id).toBe(1)
    expect(response.body[1].id).toBe(4)
  })
  test('detections filtered by is_positive === true', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      is_positive: true
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(2)
  })
  test('detections filtered by limit and offset', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      limit: 1,
      offset: 1
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(2)
  })
  test('detections sorted in descending order', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-12T00:00:00.000Z',
      descending: true
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(4)
    expect(response.body[0].id).toBe(4)
    expect(response.body[1].id).toBe(3)
    expect(response.body[2].id).toBe(2)
    expect(response.body[3].id).toBe(1)
  })
  test('detections with stream, classifier, classification, reviews fields', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:05:15.000Z',
      fields: ['id', 'start', 'end', 'confidence', 'stream', 'classifier', 'classification', 'review_status', 'reviews']
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.body[0]).sort((a, b) => a.localeCompare(b))).toEqual(['classification', 'classifier', 'confidence', 'end', 'id', 'review_status', 'reviews', 'start', 'stream'])
    expect(response.body[0].reviews[0].user.email).toBe(seedValues.primaryUserEmail)
  })
  test('detections with stream, classifier, classification fields', async () => {
    await commonSetup()
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:05:15.000Z',
      fields: ['id', 'start', 'end', 'confidence', 'stream', 'classifier', 'classification', 'review_status']
    }
    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(Object.keys(response.body[0]).sort((a, b) => a.localeCompare(b))).toEqual(['classification', 'classifier', 'confidence', 'end', 'id', 'review_status', 'start', 'stream'])
    expect(response.body[0].reviews).toBeUndefined()
  })
})
