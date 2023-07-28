const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')
const { WAITING, DONE } = require('./classifier-job-status')

const CLASSIFIER_1 = { id: 151, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }

const PROJECT_1 = { id: 'testprojec01', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testprojec02', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testprojec03', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECT_4 = { id: 'testprojec04', name: 'Test project 4', createdById: seedValues.anotherUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3, PROJECT_4]

const STREAM_1 = { id: 'rrr0stream01', name: 'Test stream', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_2 = { id: 'rrr0stream02', name: 'Test stream 2', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_3 = { id: 'rrr0stream03', name: 'Test stream 3', projectId: PROJECT_2.id, createdById: PROJECT_1.createdById }
const STREAM_4 = { id: 'rrr0stream04', name: 'Test stream 4', projectId: PROJECT_3.id, createdById: PROJECT_1.createdById }
const STREAM_5 = { id: 'rrr0stream05', name: 'Test stream 5', projectId: PROJECT_4.id, createdById: PROJECT_1.createdById }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3, STREAM_4, STREAM_5]

const JOB_1 = { id: 8001, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}, ${STREAM_2.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { id: 8002, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', minutesTotal: 4, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { id: 8003, classifierId: CLASSIFIER_1.id, projectId: STREAM_3.projectId, status: DONE, queryStreams: `${STREAM_3.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { id: 8004, classifierId: CLASSIFIER_1.id, projectId: STREAM_4.projectId, status: DONE, queryStreams: `${STREAM_4.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.primaryUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_5 = { id: 8005, classifierId: CLASSIFIER_1.id, projectId: STREAM_5.projectId, status: DONE, queryStreams: `${STREAM_5.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.anotherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5]

const CLASSIFIER_JOB_1_STREAM_1 = { classifierJobId: JOB_1.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_1_STREAM_2 = { classifierJobId: JOB_1.id, streamId: STREAM_2.id }
const CLASSIFIER_JOB_2_STREAM_1 = { classifierJobId: JOB_2.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_3_STREAM_1 = { classifierJobId: JOB_3.id, streamId: STREAM_3.id }
const CLASSIFIER_JOB_4_STREAM_1 = { classifierJobId: JOB_4.id, streamId: STREAM_4.id }
const CLASSIFIER_JOB_5_STREAM_1 = { classifierJobId: JOB_5.id, streamId: STREAM_5.id }
const CLASSIFIER_JOB_STREAMS = [CLASSIFIER_JOB_1_STREAM_1, CLASSIFIER_JOB_1_STREAM_2, CLASSIFIER_JOB_2_STREAM_1, CLASSIFIER_JOB_3_STREAM_1, CLASSIFIER_JOB_4_STREAM_1, CLASSIFIER_JOB_5_STREAM_1]

beforeAll(() => {
  muteConsole('warn')
})

beforeEach(async () => {
  await truncateNonBase(models)
  await seedTestData()
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

async function seedTestData () {
  await models.Classifier.findOrCreate({ where: CLASSIFIER_1 })
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

  for (const job of JOBS) {
    await models.ClassifierJob.findOrCreate({ where: job })
  }
  for (const classifierJobStream of CLASSIFIER_JOB_STREAMS) {
    await models.ClassifierJobStream.findOrCreate({ where: classifierJobStream })
  }
}

describe('GET /classifier-jobs/{id}', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns forbidden error', async () => {
    const response = await request(app).get(`/${JOB_5.id}`)

    expect(response.statusCode).toBe(403)
  })

  test('returns empty error', async () => {
    const response = await request(app).get('/230000123')

    expect(response.statusCode).toBe(404)
  })

  test('returns successfully', async () => {
    const response = await request(app).get(`/${JOB_1.id}`)

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.id).toBe(JOB_1.id)
    expect(result.projectId).toBe(JOB_1.projectId)
    expect(result.minutesCompleted).toBe(JOB_1.minutesCompleted)
    expect(result.minutesTotal).toBe(JOB_1.minutesTotal)
    expect(result.createdAt).toBeDefined()
    expect(result.completedAt).toBe(JOB_1.completedAt)
    expect(result.classifier.id).toBe(CLASSIFIER_1.id)
    expect(result.classifier.name).toBe(CLASSIFIER_1.name)
    expect(result.streams).toBeDefined()
    expect(result.streams.length).toBe(2)
    expect(result.streams[0].id).toBe(STREAM_1.id)
    expect(result.streams[0].name).toBe(STREAM_1.name)
    expect(result.streams[1].id).toBe(STREAM_2.id)
    expect(result.streams[1].name).toBe(STREAM_2.name)
  })

  test('customizable fields', async () => {
    const response = await request(app).get(`/${JOB_1.id}`).query({ fields: ['minutes_completed', 'minutes_total', 'query_streams'] })

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.id).toBeUndefined()
    expect(result.projectId).toBe(JOB_1.projectId)
    expect(result.minutesCompleted).toBe(JOB_1.minutesCompleted)
    expect(result.minutesTotal).toBe(JOB_1.minutesTotal)
    expect(result.queryStreams).toBe(JOB_1.queryStreams)
    expect(result.createdAt).toBeUndefined()
    expect(result.completedAt).toBeUndefined()
    expect(result.classifier).toBeUndefined()
  })
})
