const routes = require('./stream')
const models = require('../../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { ClassifierProcessedSegment } = require('../../_models')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const project = (await models.Project.findOrCreate({ where: { id: 'foo', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
  const stream1 = (await models.Stream.findOrCreate({ where: { id: 'j123k', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id } }))[0]
  const stream2 = (await models.Stream.findOrCreate({ where: { id: 'opqw1', name: 'Jaguar Station 2', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id } }))[0]
  const audioFileFormat = { id: 1, value: 'wav' }
  await models.AudioFileFormat.findOrCreate({ where: audioFileFormat })
  const audioCodec = { id: 1, value: 'wav' }
  await models.AudioCodec.findOrCreate({ where: audioCodec })
  const fileExtension = { id: 1, value: '.wav' }
  await models.FileExtension.findOrCreate({ where: fileExtension })
  const classifier1 = (await models.Classifier.findOrCreate({ where: { externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something' } }))[0]
  const classifier2 = (await models.Classifier.findOrCreate({ where: { externalId: 'fffbbb', name: 'vehicle model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something2' } }))[0]
  const classifier3 = (await models.Classifier.findOrCreate({ where: { externalId: 'zzzvvv', name: 'gunshot model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something3' } }))[0]
  const job1 = (await models.ClassifierJob.findOrCreate({ where: { created_at: '2022-01-02 04:10', classifierId: classifier1.id, projectId: project.id, createdById: seedValues.primaryUserId } }))[0]
  const job2 = (await models.ClassifierJob.findOrCreate({ where: { created_at: '2022-01-02 04:12', classifierId: classifier1.id, projectId: project.id, createdById: seedValues.primaryUserId } }))[0]
  const job3 = (await models.ClassifierJob.findOrCreate({ where: { created_at: '2022-01-02 04:14', classifierId: classifier2.id, projectId: project.id, createdById: seedValues.primaryUserId } }))[0]
  return { project, stream1, stream2, classifier1, classifier2, classifier3, job1, job2, job3 }
}

describe('POST /streams/segments/processed', () => {
  test('creates 1 processed segment without job', async () => {
    const { stream1, classifier1 } = await commonSetup()
    const requestBody = [{ stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id }]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(201)
    const processedSegments = await ClassifierProcessedSegment.findAll()
    expect(processedSegments.length).toBe(1)
    expect(processedSegments[0].streamId).toBe(stream1.id)
    expect(processedSegments[0].start.toISOString()).toBe(requestBody[0].start)
    expect(processedSegments[0].classifier_id).toBe(classifier1.id)
    expect(processedSegments[0].classifier_job_id).toBeNull()
  })
  test('creates 1 processed segment with job id', async () => {
    const { stream1, classifier1, job1 } = await commonSetup()
    const requestBody = [{ stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id, classifier_job: job1.id }]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(201)
    const processedSegments = await ClassifierProcessedSegment.findAll()
    expect(processedSegments.length).toBe(1)
    expect(processedSegments[0].streamId).toBe(stream1.id)
    expect(processedSegments[0].start.toISOString()).toBe(requestBody[0].start)
    expect(processedSegments[0].classifier_id).toBe(classifier1.id)
    expect(processedSegments[0].classifier_job_id).toBe(job1.id)
  })
  test('creates 3 processed segments', async () => {
    const { stream1, classifier1, job1 } = await commonSetup()
    const requestBody = [
      { stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:01:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:02:00.000Z', classifier: classifier1.id, classifier_job: job1.id }
    ]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(201)
    const processedSegments = await ClassifierProcessedSegment.findAll({ sort: [['start', 'ASC']] })
    expect(processedSegments.length).toBe(3)
    expect(processedSegments[0].streamId).toBe(stream1.id)
    expect(processedSegments[0].start.toISOString()).toBe(requestBody[0].start)
    expect(processedSegments[0].classifier_id).toBe(classifier1.id)
    expect(processedSegments[0].classifier_job_id).toBe(job1.id)
    expect(processedSegments[1].streamId).toBe(stream1.id)
    expect(processedSegments[1].start.toISOString()).toBe(requestBody[1].start)
    expect(processedSegments[1].classifier_id).toBe(classifier1.id)
    expect(processedSegments[1].classifier_job_id).toBe(job1.id)
    expect(processedSegments[2].streamId).toBe(stream1.id)
    expect(processedSegments[2].start.toISOString()).toBe(requestBody[2].start)
    expect(processedSegments[2].classifier_id).toBe(classifier1.id)
    expect(processedSegments[2].classifier_job_id).toBe(job1.id)
  })
  test('creates 5 processed segments for different streams and jobs', async () => {
    const { stream1, stream2, classifier1, classifier2, job1, job3 } = await commonSetup()
    const requestBody = [
      { stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:01:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:02:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:03:00.000Z', classifier: classifier2.id, classifier_job: job3.id },
      { stream: stream2.id, start: '2021-07-26T00:04:00.000Z', classifier: classifier2.id, classifier_job: job3.id }
    ]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(201)
    const processedSegments = await ClassifierProcessedSegment.findAll({ sort: [['start', 'ASC']] })
    expect(processedSegments.length).toBe(5)
    expect(processedSegments[0].streamId).toBe(stream1.id)
    expect(processedSegments[0].start.toISOString()).toBe(requestBody[0].start)
    expect(processedSegments[0].classifier_id).toBe(classifier1.id)
    expect(processedSegments[0].classifier_job_id).toBe(job1.id)
    expect(processedSegments[1].streamId).toBe(stream1.id)
    expect(processedSegments[1].start.toISOString()).toBe(requestBody[1].start)
    expect(processedSegments[1].classifier_id).toBe(classifier1.id)
    expect(processedSegments[1].classifier_job_id).toBe(job1.id)
    expect(processedSegments[2].streamId).toBe(stream1.id)
    expect(processedSegments[2].start.toISOString()).toBe(requestBody[2].start)
    expect(processedSegments[2].classifier_id).toBe(classifier1.id)
    expect(processedSegments[2].classifier_job_id).toBe(job1.id)
    expect(processedSegments[3].streamId).toBe(stream1.id)
    expect(processedSegments[3].start.toISOString()).toBe(requestBody[3].start)
    expect(processedSegments[3].classifier_id).toBe(classifier2.id)
    expect(processedSegments[3].classifier_job_id).toBe(job3.id)
    expect(processedSegments[4].streamId).toBe(stream2.id)
    expect(processedSegments[4].start.toISOString()).toBe(requestBody[4].start)
    expect(processedSegments[4].classifier_id).toBe(classifier2.id)
    expect(processedSegments[4].classifier_job_id).toBe(job3.id)
  })
  test('creating a duplicate row does not create a duplicate', async () => {
    const { stream1, classifier1, job1 } = await commonSetup()
    const requestBody = [
      { stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:01:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:02:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:01:00.000Z', classifier: classifier1.id, classifier_job: job1.id }
    ]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(201)
    const processedSegments = await ClassifierProcessedSegment.findAll({ sort: [['start', 'ASC']] })
    expect(processedSegments.length).toBe(3)
    expect(processedSegments[0].start.toISOString()).toBe(requestBody[0].start)
    expect(processedSegments[1].start.toISOString()).toBe(requestBody[1].start)
    expect(processedSegments[2].start.toISOString()).toBe(requestBody[2].start)
  })
  test('returns 403 if user sends data for not accessible streams', async () => {
    const { stream1, classifier1, job1 } = await commonSetup()
    const project2 = (await models.Project.findOrCreate({ where: { id: 'bar', name: 'not mine project', createdById: seedValues.otherUserId } }))[0]
    const stream3 = await models.Stream.create({ id: 'opqw3', name: 'Jaguar Station 3', latitude: 10.1, longitude: 101.1, createdById: seedValues.otherUserId, projectId: project2.id })
    const requestBody = [
      { stream: stream1.id, start: '2021-07-26T00:00:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream1.id, start: '2021-07-26T00:01:00.000Z', classifier: classifier1.id, classifier_job: job1.id },
      { stream: stream3.id, start: '2021-07-26T00:02:00.000Z', classifier: classifier1.id, classifier_job: job1.id }
    ]
    const response = await request(app).post('/streams/segments/processed').send(requestBody)
    expect(response.statusCode).toBe(403)
    const processedSegments = await ClassifierProcessedSegment.findAll()
    expect(processedSegments.length).toBe(0)
  })
})
