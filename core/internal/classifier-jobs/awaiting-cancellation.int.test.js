const routes = require('.')
const models = require('../../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../../common/testing/sequelize')
const request = require('supertest')
const { randomId } = require('../../../common/crypto/random')
const { AWAITING_CANCELLATION, RUNNING } = require('../../classifier-jobs/classifier-job-status')

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

describe('GET /internal/classifier-jobs/awaiting-cancellation', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns an array', async () => {
    const response = await request(app).get('/awaiting-cancellation')

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })

  test('picks the oldest waiting job', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Older job
    const firstJob = await models.ClassifierJob.create({ created_at: '2022-01-02 03:15', updatedAt: '2022-01-02 03:15', classifierId, projectId, createdById: seedValues.otherUserId, status: AWAITING_CANCELLATION })
    // Newer job
    await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', updatedAt: '2022-01-02 04:10', classifierId, projectId, createdById: seedValues.otherUserId, status: AWAITING_CANCELLATION })

    const response = await request(app).get('/awaiting-cancellation')
    expect(response.body).toHaveLength(2)
    expect(response.body[0].id).toBe(firstJob.id)
  })

  test('does not return non-cancel jobs', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Waiting cancel job
    const firstJob = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, queryStreams: 'RAG4,RAG5,RAG1*', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })
    // Running job
    await models.ClassifierJob.create({ status: RUNNING, classifierId, projectId, queryStreams: 'GUG1', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })

    const response = await request(app).get('/awaiting-cancellation').query({ limit: '2' })

    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toBe(firstJob.id)
  })

  test('respects limit', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/awaiting-cancellation').query({ limit: '2' })

    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('3')
  })

  test('respects offset', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/awaiting-cancellation').query({ offset: '2' })

    expect(response.body).toHaveLength(1)
    expect(response.headers['total-items']).toBe('3')
  })

  test('respects sort', async () => {
    const { classifierId, projectId } = await commonSetup()
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/awaiting-cancellation').query({ sort: '-created_at' })

    expect(response.body).toHaveLength(3)
    expect(response.headers['total-items']).toBe('3')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
    expect(response.body[2].id).toBe(job1.id)
  })
})
