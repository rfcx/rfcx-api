const request = require('supertest')
const routes = require('.')
const models = require('../../../modelsTimescale')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../utils/sequelize/testing')

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
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', type_id: 1, source_id: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  return { stream, classification, classifier }
}

describe('GET /detections/:id/:start', () => {
  test('Returns correct detection', async () => {
    const { stream, classifier, classification } = await commonSetup()
    const detection = {
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.5
    }
    const dbDetection = await models.Detection.create(detection)

    const response = await request(app).get(`/${dbDetection.id}/2021-05-11T00:05:00.000Z`).query()

    expect(response.statusCode).toBe(200)
    expect(response.body.end).toBe('2021-05-11T00:05:05.000Z')
  })
  test('Returns 404 when id not found', async () => {
    const { stream, classifier, classification } = await commonSetup()
    const detection = {
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.5
    }
    await models.Detection.create(detection)

    const response = await request(app).get('/1231295/2021-05-11T00:05:00.000Z').query()

    expect(response.statusCode).toBe(404)
  })
  test('Returns 404 when start not found', async () => {
    const { stream, classifier, classification } = await commonSetup()
    const detection = {
      stream_id: stream.id,
      classifier_id: classifier.id,
      classification_id: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.5
    }
    const dbDetection = await models.Detection.create(detection)

    const response = await request(app).get(`/${dbDetection.id}/2021-06-01T00:00:00.000Z`).query()

    expect(response.statusCode).toBe(404)
  })
})
