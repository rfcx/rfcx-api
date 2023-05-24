const routes = require('.')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { randomId } = require('../../../common/crypto/random')
const { RUNNING, DONE } = require('../../classifier-jobs/classifier-job-status')

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

function withIds (obj) {
  return {
    ...Object.fromEntries(Object.entries(obj).map(([k, v]) => [k + 'Id', v.id])),
    ...obj
  }
}

async function commonSetup () {
  const classifier = await models.Classifier.create({ name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true })
  const project = await models.Project.create({ id: randomId(), name: 'Finnish Bears', createdById: seedValues.otherUserId })

  return withIds({ classifier, project })
}

describe('POST /internal/classifier-jobs/dequeue', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns an array', async () => {
    const response = await request(app).post('/dequeue')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('picks the oldest waiting job', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Newer job
    await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', classifierId, projectId, createdById: seedValues.otherUserId })
    // Older job
    const firstJob = await models.ClassifierJob.create({ created_at: '2022-01-02 03:15', classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toBe(firstJob.id)
  })

  test('updates job status to running', async () => {
    const { classifierId, projectId } = await commonSetup()
    const job = await models.ClassifierJob.create({ projectId, classifierId, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body[0].id).toBe(job.id)
    const updatedJob = await models.ClassifierJob.findByPk(job.id)
    expect(updatedJob.status).toBe(RUNNING)
    expect(updatedJob.startedAt).toBeTruthy()
    expect(response.body[0].status).toBe(RUNNING)
  })

  test('does not return non-waiting jobs', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Completed job
    await models.ClassifierJob.create({ status: DONE, classifierId, projectId, queryStreams: 'RAG4,RAG5,RAG1*', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })
    // Running job
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, queryStreams: 'GUG1', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body).toHaveLength(0)
  })

  test('does not return when concurrency reached', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Running jobs (2)
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, createdById: seedValues.otherUserId })
    // Waiting job
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '2' })

    expect(response.body).toHaveLength(0)
  })

  test('returns no more than the concurrency', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Running jobs (2)
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, createdById: seedValues.otherUserId })
    // Waiting jobs (2)
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '3' })

    expect(response.body).toHaveLength(1)
  })

  test('respects limit', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Running job
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, createdById: seedValues.otherUserId })
    // Waiting jobs (3)
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '4', limit: '2' })

    expect(response.body).toHaveLength(2)
  })
})
