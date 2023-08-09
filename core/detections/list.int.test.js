const request = require('supertest')
const routes = require('.')
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
  const project = (await models.Project.findOrCreate({ where: { id: 'foo', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
  const stream = { id: 'abc', name: 'my stream', createdById: seedValues.primaryUserId, projectId: project.id }
  await models.Stream.create(stream)
  const classification = { id: 6, value: 'chainsaw', title: 'Chainsaw', typeId: 1, sourceId: 1 }
  await models.Classification.create(classification)
  const classifier = { id: 3, externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.otherUserId, modelRunner: 'tf2', modelUrl: 's3://something' }
  await models.Classifier.create(classifier)
  const job1 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', classifierId: classifier.id, projectId: project.id, createdById: seedValues.primaryUserId })
  const job2 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:12', classifierId: classifier.id, projectId: project.id, createdById: seedValues.primaryUserId })
  return { project, stream, classification, classifier, job1, job2 }
}

describe('GET /detections', () => {
  test('success', async () => {
    const { stream, classifier, classification } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.5
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      min_confidence: 0.1
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })
  test('get 1 by classifier_jobs', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id
    })
    const detection3 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      classifier_jobs: [job2.id]
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(detection3.start.toISOString())
  })
  test('get 2 by classifier_jobs', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    const detection2 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id
    })
    const detection3 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      classifier_jobs: [job1.id, job2.id]
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].start).toBe(detection2.start.toISOString())
    expect(response.body[1].start).toBe(detection3.start.toISOString())
  })
  test('get all reviewed detections', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    const detection2 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    const detection3 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    const detection4 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['rejected', 'uncertain', 'confirmed']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(3)
    expect(response.body[0].start).toBe(detection2.start.toISOString())
    expect(response.body[1].start).toBe(detection3.start.toISOString())
    expect(response.body[2].start).toBe(detection4.start.toISOString())
  })
  test('get detections with negative review', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    const detection2 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['rejected']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(detection2.start.toISOString())
  })
  test('get detections with uncertain review', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    const detection3 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['uncertain']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(detection3.start.toISOString())
  })
  test('get detections with positive review', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    const detection4 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['confirmed']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(detection4.start.toISOString())
  })
  test('get unreviewed detections', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    const detection = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['unreviewed']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].start).toBe(detection.start.toISOString())
  })
  test('get unreviewed and uncertain detections', async () => {
    const { stream, classifier, classification, job1, job2 } = await commonSetup()
    const detection = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:05:00.000Z',
      end: '2021-05-11T00:05:05.000Z',
      confidence: 0.95
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:15:00.000Z',
      end: '2021-05-11T00:15:05.000Z',
      confidence: 0.95,
      classifier_job_id: job1.id,
      reviewStatus: -1
    })
    const detection3 = await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:25:00.000Z',
      end: '2021-05-11T00:25:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 0
    })
    await models.Detection.create({
      streamId: stream.id,
      classifierId: classifier.id,
      classificationId: classification.id,
      start: '2021-05-11T00:35:00.000Z',
      end: '2021-05-11T00:35:05.000Z',
      confidence: 0.95,
      classifier_job_id: job2.id,
      reviewStatus: 1
    })
    const query = {
      start: '2021-05-11T00:00:00.000Z',
      end: '2021-05-11T00:59:59.999Z',
      review_statuses: ['uncertain', 'unreviewed']
    }

    const response = await request(app).get('/').query(query)

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(2)
    expect(response.body[0].start).toBe(detection.start.toISOString())
    expect(response.body[1].start).toBe(detection3.start.toISOString())
  })
})
