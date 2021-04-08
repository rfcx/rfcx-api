const request = require('supertest')
const routes = require('./stream')
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
  const classifier = { id: 3, external_id: 'cccddd', name: 'chainsaw model', version: 1, created_by_id: seedValues.otherUserId, model_runner: 'tf2', model_url: 's3://something' }
  await models.Classifier.create(classifier)
  const classifierOutput = { classifier_id: classifier.id, classification_id: classification.id, output_class_name: 'chnsw', ignore_threshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('POST /streams/:id/detections', () => {
  test('success', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold + 0.05 },
      { start: '2021-03-15T00:00:05Z', end: '2021-03-15T00:00:10Z', classifier: classifier.id.toString(), classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold + 0.15 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(requestBody.length)
  })

  test('success on legacy external id', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.external_id, classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold + 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(requestBody.length)
  })

  test('skip detections below threshold', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold + 0.05 },
      { start: '2021-03-15T00:00:05Z', end: '2021-03-15T00:00:10Z', classifier: classifier.id.toString(), classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold - 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(1)
  })

  test('warn on invalid classifier id', async () => {
    console.warn = jest.fn()
    const { stream, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: 'unknown', classification: classifierOutput.output_class_name, confidence: classifierOutput.ignore_threshold + 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(console.warn).toHaveBeenCalled()
  })

  test('warn on invalid classification output class name', async () => {
    console.warn = jest.fn()
    const { stream, classifier } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: 'unknown', confidence: 0.95 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(console.warn).toHaveBeenCalled()
  })
})
