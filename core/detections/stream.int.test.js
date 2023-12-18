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
  const project = await models.Project.create({ id: 'foo', name: 'my project', createdById: seedValues.primaryUserId })
  await models.UserProjectRole.create({ user_id: project.createdById, project_id: project.id, role_id: seedValues.roleOwner })
  const stream = await models.Stream.create({ id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId, projectId: project.id })
  await models.UserStreamRole.create({ stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner })
  const classification = await models.Classification.create({ value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 })
  const classifier = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifierOutput = { classifierId: classifier.id, classificationId: classification.id, outputClassName: 'chnsw', ignoreThreshold: 0.1 }
  await models.ClassifierOutput.create(classifierOutput)
  return { project, stream, classification, classifier, classifierOutput }
}

describe('POST /streams/:id/detections', () => {
  test('success', async () => {
    const { stream, classifier, classification, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 },
      { start: '2021-03-15T00:00:05.000Z', end: '2021-03-15T00:00:10.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.15 }
    ]
    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll({ sort: [['start', 'ASC']] })
    expect(detections.length).toBe(requestBody.length)
    expect(detections[0].start.toISOString()).toBe(requestBody[0].start)
    expect(detections[0].end.toISOString()).toBe(requestBody[0].end)
    expect(detections[0].classifierId).toBe(classifier.id)
    expect(detections[0].classificationId).toBe(classification.id)
    expect(detections[0].confidence).toBe(requestBody[0].confidence)
    expect(detections[0].classifierJobId).toBeNull()
  })

  test('success on classifier job id', async () => {
    const { project, stream, classifier, classifierOutput } = await commonSetup()
    const job1 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', classifierId: classifier.id, projectId: project.id, createdById: seedValues.primaryUserId })
    const job2 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:12', classifierId: classifier.id, projectId: project.id, createdById: seedValues.primaryUserId })
    const requestBody = [
      { start: '2021-03-15T00:00:00Z', end: '2021-03-15T00:00:05Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05, classifier_job_id: job1.id },
      { start: '2021-03-15T00:00:05Z', end: '2021-03-15T00:00:10Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.15, classifier_job_id: job2.id }
    ]
    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll({ sort: [['start', 'ASC']] })
    expect(detections.length).toBe(requestBody.length)
    expect(detections[0].classifier_job_id).toBe(job1.id)
    expect(detections[1].classifier_job_id).toBe(job2.id)
  })

  test('success on legacy external id', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.externalId, classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const detections = await models.Detection.findAll()
    expect(detections.length).toBe(requestBody.length)
  })

  test('skip detections below threshold', async () => {
    const { stream, classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 },
      { start: '2021-03-15T00:00:05.000Z', end: '2021-03-15T00:00:10.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold - 0.05 }
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
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: 'unknown', classification: classifierOutput.outputClassName, confidence: classifierOutput.ignoreThreshold + 0.05 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(console.warn).toHaveBeenCalled()
  })

  test('warn on invalid classification output class name', async () => {
    console.warn = jest.fn()
    const { stream, classifier } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: 'unknown', confidence: 0.95 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(console.warn).toHaveBeenCalled()
  })

  test('stream not found', async () => {
    const { classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(app).post('/b0gU5stream/detections').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('stream not found when system role', async () => {
    const appWithUserSystemRole = expressApp({ has_system_role: true })
    appWithUserSystemRole.use('/', routes)
    const { classifier, classifierOutput } = await commonSetup()
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(appWithUserSystemRole).post('/b0gU5stream/detections').send(requestBody)

    expect(response.statusCode).toBe(404)
  })

  test('stream not accessible', async () => {
    const { classifier, classifierOutput } = await commonSetup()
    const stream = { id: 'xyz', name: 'not my stream', createdById: seedValues.otherUserId }
    await models.Stream.create(stream)
    const requestBody = [
      { start: '2021-03-15T00:00:00.000Z', end: '2021-03-15T00:00:05.000Z', classifier: classifier.id.toString(), classification: classifierOutput.outputClassName, confidence: 0.99 }
    ]

    const response = await request(app).post(`/${stream.id}/detections`).send(requestBody)

    expect(response.statusCode).toBe(403)
  })
})
