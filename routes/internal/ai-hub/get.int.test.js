const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId }
  await models.Stream.create(stream)
  const stream2 = { id: 'def', name: 'my stream2', createdById: seedValues.otherUserId }
  await models.Stream.create(stream2)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  return { stream, stream2, classification, classifier }
}

describe('GET /internal/ai-hub/detections', () => {
  test('bad request', async () => {
    console.warn = jest.fn()

    const response = await request(app).get('/detections')

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong start format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: 'abc', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('bad request with wrong end format', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: 'abc' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(400)
  })

  test('request with number type start', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '12345', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('request with number type end', async () => {
    console.warn = jest.fn()
    const requestQuery = { start: '2020-01-01T00:00:00', end: '12345' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
  })

  test('no result', async () => {
    const requestQuery = { start: '2020-01-01T00:00:00', end: '2020-02-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('get detectons intergrate with empty annotations', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, classifier_id: classifier.id, classification_id: classification.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', confidence: 0.9 }
    await models.Detection.create(detection)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.total).toBe(0)
    expect(response.body[0].review.positive).toBe(0)
    expect(response.body[0].review.my).toBe(null)
  })

  test('get detectons intergrate with annotations created by other user', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection)
    const annotation = { stream_id: stream.id, classification_id: classification.id, start: detection.start, end: detection.end, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId }
    await models.Annotation.create(annotation)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.total).toBe(1)
    expect(response.body[0].review.positive).toBe(1)
    expect(response.body[0].review.negative).toBe(0)
    expect(response.body[0].review.my).toBe(null)
  })

  test('get detectons intergrate with annotations created by current user', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection)
    const annotation = { stream_id: stream.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId, is_positive: true, classification_id: classification.id, start: detection.start, end: detection.end }
    await models.Annotation.create(annotation)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.total).toBe(1)
    expect(response.body[0].review.positive).toBe(1)
    expect(response.body[0].review.negative).toBe(0)
    expect(response.body[0].review.my).toBe(true)
  })

  test('get detectons intergrate with annotations created by current user with negative', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection)
    const annotation = { stream_id: stream.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId, is_positive: false, classification_id: classification.id, start: detection.start, end: detection.end }
    await models.Annotation.create(annotation)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.my).toBe(false)
  })

  test('get detectons intergrate with multiple user annotated', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection)
    const annotation1 = { stream_id: stream.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId, is_positive: true, classification_id: classification.id, start: detection.start, end: detection.end }
    const annotation2 = { stream_id: stream.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId, is_positive: false, classification_id: classification.id, start: detection.start, end: detection.end }
    await models.Annotation.create(annotation1)
    await models.Annotation.create(annotation2)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00' }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.total).toBe(2)
    expect(response.body[0].review.positive).toBe(1)
    expect(response.body[0].review.negative).toBe(1)
    expect(response.body[0].review.my).toBe(true)
  })

  test('get detectons intergrate with annotations filter by min_confidence', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection1 = { stream_id: stream.id, confidence: 0.9, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id }
    const detection2 = { stream_id: stream.id, confidence: 0.7, start: '2020-05-02T00:02:00', end: '2020-05-02T00:03:00', classifier_id: classifier.id, classification_id: classification.id }
    await models.Detection.create(detection1)
    await models.Detection.create(detection2)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00', min_confidence: 0.8 }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].confidence).toBe(detection1.confidence)
  })

  test('get detectons intergrate with is_review = false', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection1 = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    const detection2 = { stream_id: stream.id, start: '2020-05-02T00:03:00', end: '2020-05-02T00:04:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection1)
    await models.Detection.create(detection2)
    const annotation1 = { stream_id: stream.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId, is_positive: true, classification_id: classification.id, start: detection1.start, end: detection1.end }
    const annotation2 = { stream_id: stream.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId, is_positive: false, classification_id: classification.id, start: detection1.start, end: detection1.end }
    await models.Annotation.create(annotation1)
    await models.Annotation.create(annotation2)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00', is_reviewed: false }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].review.total).toBe(0)
    expect(response.body[0].review.positive).toBe(0)
    expect(response.body[0].review.negative).toBe(0)
    expect(response.body[0].review.my).toBe(null)
  })

  test('get detectons intergrate with is_postive = true', async () => {
    const { stream, classification, classifier } = await commonSetup()
    const detection1 = { stream_id: stream.id, start: '2020-05-02T00:01:00', end: '2020-05-02T00:02:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    const detection2 = { stream_id: stream.id, start: '2020-05-02T00:03:00', end: '2020-05-02T00:04:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    const detection3 = { stream_id: stream.id, start: '2020-05-02T00:05:00', end: '2020-05-02T00:06:00', classifier_id: classifier.id, classification_id: classification.id, confidence: 0.9 }
    await models.Detection.create(detection1)
    await models.Detection.create(detection2)
    await models.Detection.create(detection3)
    const annotation1 = { stream_id: stream.id, created_by_id: seedValues.primaryUserId, updated_by_id: seedValues.primaryUserId, is_positive: true, classification_id: classification.id, start: detection1.start, end: detection1.end }
    const annotation2 = { stream_id: stream.id, created_by_id: seedValues.otherUserId, updated_by_id: seedValues.otherUserId, is_positive: true, classification_id: classification.id, start: detection2.start, end: detection2.end }
    await models.Annotation.create(annotation1)
    await models.Annotation.create(annotation2)

    const requestQuery = { start: '2020-01-01T00:00:00', end: '2021-01-01T00:00:00', is_positive: true }

    const response = await request(app).get('/detections').query(requestQuery)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].review.total).toBe(1)
    expect(response.body[0].review.positive).toBe(1)
    expect(response.body[0].review.negative).toBe(0)
    expect(response.body[0].review.my).toBe(true)
    expect(response.body[1].review.total).toBe(1)
    expect(response.body[1].review.positive).toBe(1)
    expect(response.body[1].review.negative).toBe(0)
    expect(response.body[1].review.my).toBe(null)
  })
})
