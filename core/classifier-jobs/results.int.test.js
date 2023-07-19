const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const { WAITING, DONE } = require('./classifier-job-status')

const CLASSIFICATION_1 = { id: 232, value: 'chainsaw', title: 'Chainsaw', typeId: 1, source_id: 1 }
const CLASSIFICATION_2 = { id: 233, value: 'vehicle', title: 'Vehicle', typeId: 1, source_id: 1 }
const CLASSIFICATION_3 = { id: 234, value: 'gunshot', title: 'Gunshot', typeId: 1, source_id: 1 }
const CLASSIFICATIONS = [CLASSIFICATION_1, CLASSIFICATION_2, CLASSIFICATION_3]
const CLASSIFIER_1 = { id: 151, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIER_OUTPUT_1 = { id: 100, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_1.id, outputClassName: 'chainsaw_custom', ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_2 = { id: 101, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_2.id, outputClassName: 'chainsaw_custom', ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUT_3 = { id: 102, classifierId: CLASSIFIER_1.id, classificationId: CLASSIFICATION_3.id, outputClassName: 'chainsaw_custom', ignoreThreshold: 0.5 }
const CLASSIFIER_OUTPUTS = [CLASSIFIER_OUTPUT_1, CLASSIFIER_OUTPUT_2, CLASSIFIER_OUTPUT_3]

const PROJECT_1 = { id: 'testprojec01', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testprojec02', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testprojec03', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECT_4 = { id: 'testprojec04', name: 'Test project 4', createdById: seedValues.anotherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3, PROJECT_4]

const STREAM_1 = { id: 'stream000001', name: 'Test stream', createdById: seedValues.otherUserId, projectId: PROJECT_1.id }
const STREAMS = [STREAM_1]

const JOB_1 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, status: WAITING, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-01-01', queryEnd: '2021-02-01', queryHours: '0,1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, status: WAITING, queryStreams: 'Test stream', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', minutesTotal: 4, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_2.id, status: DONE, queryStreams: 'Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_3.id, status: DONE, queryStreams: 'Test stream 3', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.primaryUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_5 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_4.id, status: DONE, queryStreams: 'Not accessible project', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.anotherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }

beforeAll(() => {
  muteConsole('warn')
})

beforeEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

async function seedTestData () {
  for (const classification of CLASSIFICATIONS) {
    await models.Classification.findOrCreate({ where: classification })
  }
  await models.Classifier.findOrCreate({ where: CLASSIFIER_1 })
  for (const output of CLASSIFIER_OUTPUTS) {
    await models.ClassifierOutput.findOrCreate({ where: output })
  }
  for (const project of PROJECTS) {
    await models.Project.findOrCreate({ where: project })
  }
  for (const stream of STREAMS) {
    await models.Stream.findOrCreate({ where: stream })
  }
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_3.id, role_id: seedValues.roleAdmin } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.anotherUserId, project_id: PROJECT_4.id, role_id: seedValues.roleAdmin } })

  const job1 = (await models.ClassifierJob.findOrCreate({ where: JOB_1 }))[0]
  const job2 = (await models.ClassifierJob.findOrCreate({ where: JOB_2 }))[0]
  const job3 = (await models.ClassifierJob.findOrCreate({ where: JOB_3 }))[0]
  const job4 = (await models.ClassifierJob.findOrCreate({ where: JOB_4 }))[0]
  const job5 = (await models.ClassifierJob.findOrCreate({ where: JOB_5 }))[0]

  return { job1, job2, job3, job4, job5 }
}

describe('GET /classifier-jobs/{id}/results', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns forbidden error', async () => {
    const { job5 } = await seedTestData()
    const response = await request(app).get(`/${job5.id}/results`)

    expect(response.statusCode).toBe(403)
  })

  test('returns validation error if fields is not correct', async () => {
    const { job1 } = await seedTestData()
    const response = await request(app).get(`/${job1.id}/results`).query({ fields: ['some'] })

    expect(response.statusCode).toBe(400)
  })

  test('returns validation error if fields includes not correct value', async () => {
    const { job1 } = await seedTestData()
    const response = await request(app).get(`/${job1.id}/results`).query({ fields: ['review_status', 'some'] })

    expect(response.statusCode).toBe(400)
  })

  test('returns empty error', async () => {
    const response = await request(app).get('/230000123/results')

    expect(response.statusCode).toBe(404)
  })

  test('returns only review status by default', async () => {
    const { job1 } = await seedTestData()
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:00.000Z`, end: `${JOB_1.queryStart}T00:00:01.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: 1 } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:01.000Z`, end: `${JOB_1.queryStart}T00:00:02.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: -1 } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:02.000Z`, end: `${JOB_1.queryStart}T00:00:03.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: null } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:03.000Z`, end: `${JOB_1.queryStart}T00:00:04.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: 0 } })

    const response = await request(app).get(`/${job1.id}/results`)

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.reviewStatus.total).toBe(4)
    expect(result.reviewStatus.confirmed).toBe(1)
    expect(result.reviewStatus.rejected).toBe(1)
    expect(result.reviewStatus.uncertain).toBe(1)
  })

  test('returns full data', async () => {
    const { job1 } = await seedTestData()
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:00.000Z`, end: `${JOB_1.queryStart}T00:00:01.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: 1 } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:01.000Z`, end: `${JOB_1.queryStart}T00:00:02.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_1.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: -1 } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:02.000Z`, end: `${JOB_1.queryStart}T00:00:03.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: null } })
    await models.Detection.findOrCreate({ where: { start: `${JOB_1.queryStart}T00:00:03.000Z`, end: `${JOB_1.queryStart}T00:00:04.000Z`, streamId: STREAM_1.id, classificationId: CLASSIFICATION_2.id, classifierId: CLASSIFIER_1.id, classifierJobId: job1.id, confidence: 0.99, reviewStatus: 0 } })

    const response = await request(app).get(`/${job1.id}/results`).query({ fields: ['review_status', 'classifications_summary'] })

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.reviewStatus.total).toBe(4)
    expect(result.reviewStatus.confirmed).toBe(1)
    expect(result.reviewStatus.rejected).toBe(1)
    expect(result.reviewStatus.uncertain).toBe(1)
    const output1 = result.classificationsSummary.find(o => CLASSIFICATION_1.value === o.value)
    expect(output1.value).toBe(CLASSIFICATION_1.value)
    expect(output1.label).toBe(CLASSIFICATION_1.label)
    expect(output1.total).toBe(1)
    const output2 = result.classificationsSummary.find(o => CLASSIFICATION_2.value === o.value)
    expect(output2.value).toBe(CLASSIFICATION_2.value)
    expect(output2.label).toBe(CLASSIFICATION_2.label)
    expect(output2.total).toBe(0)
    const output3 = result.classificationsSummary.find(o => CLASSIFICATION_3.value === o.value)
    expect(output3.value).toBe(CLASSIFICATION_3.value)
    expect(output3.label).toBe(CLASSIFICATION_3.label)
    expect(output3.total).toBe(0)
  })
})
