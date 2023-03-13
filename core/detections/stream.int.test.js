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

async function commonSetup () {
  const stream = (await models.Stream.findOrCreate({ where: { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId } }))[0]
  const classification = (await models.Classification.findOrCreate({ where: { value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 } }))[0]
  const classifier = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { stream, classification, classifier, classifierOutput }
}

describe('POST /streams/:id/detections', () => {
  test('success', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 },
      { start: '2021-03-15T00:00:05Z', end: '2021-03-15T00:00:10Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.15 }
    ]
    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(requestBody.length)
  })

  test('success on legacy external id', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.externalId, classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(requestBody.length)
  })

  test('skip detections below threshold', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 },
      { start: '2021-03-15T00:00:05Z', end: '2021-03-15T00:00:10Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold - 0.05 }
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
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: 'unknown', classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 }
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

  test('stream not found', async () => {
    const { classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(app).post('/b0gU5stream/detections').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('stream not found when system role', async () => {
    const appWithUserSystemRole = expressApp({ has_system_role: true })
    appWithUserSystemRole.use('/', routes)
    const { classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(appWithUserSystemRole).post('/b0gU5stream/detections').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('stream not accessible', async () => {
    const { classifier, classifierOutput } = await commonSetup()
    const stream = { id: 'xyz', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })
})
