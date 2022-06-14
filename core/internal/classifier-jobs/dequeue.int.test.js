const routes = require('.')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { randomId } = require('../../../common/crypto/random')
const { RUNNING, DONE } = require('../../classifier-jobs/classifier-job-status')

// Test data
const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

async function seedTestData () {
  await models.Classifier.bulkCreate(CLASSIFIERS)
}

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})

beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

async function commonSetup () {
  const project = { id: randomId(), name: 'Finnish Bears', createdById: seedValues.otherUserId }
  await models.Project.create(project)
  return { project }
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
    const { project } = await commonSetup()
    // Newer job
    await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    // Older job
    const firstJob = await models.ClassifierJob.create({ created_at: '2022-01-02 03:15', classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toBe(firstJob.id)
  })

  test('updates job status to running', async () => {
    const { project } = await commonSetup()
    const job = await models.ClassifierJob.create({ projectId: project.id, classifierId: CLASSIFIER_1.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body[0].id).toBe(job.id)
    const updatedJob = await models.ClassifierJob.findByPk(job.id)
    expect(updatedJob.status).toBe(RUNNING)
    expect(response.body[0].status).toBe(RUNNING)
  })

  test('does not return non-waiting jobs', async () => {
    const { project } = await commonSetup()
    // Completed job
    await models.ClassifierJob.create({ status: DONE, classifierId: CLASSIFIER_1.id, projectId: project.id, queryStreams: 'RAG4,RAG5,RAG1*', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })
    // Running job
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, queryStreams: 'GUG1', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue')

    expect(response.body).toHaveLength(0)
  })

  test('does not return when concurrency reached', async () => {
    const { project } = await commonSetup()
    // Running jobs (2)
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    // Waiting job
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '2' })

    expect(response.body).toHaveLength(0)
  })

  test('returns no more than the concurrency', async () => {
    const { project } = await commonSetup()
    // Running jobs (2)
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    // Waiting jobs (2)
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '3' })

    expect(response.body).toHaveLength(1)
  })

  test('respects limit', async () => {
    const { project } = await commonSetup()
    // Running job
    await models.ClassifierJob.create({ status: RUNNING, classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    // Waiting jobs (3)
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ classifierId: CLASSIFIER_1.id, projectId: project.id, createdById: seedValues.otherUserId })

    const response = await request(app).post('/dequeue').query({ concurrency: '4', limit: '2' })

    expect(response.body).toHaveLength(2)
  })
})
