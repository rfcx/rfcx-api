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

const JOB_1 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, status: WAITING, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
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
  await models.Classifier.findOrCreate({ where: CLASSIFIER_1 })
  for (const project of PROJECTS) {
    await models.Project.findOrCreate({ where: project })
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

describe('GET /classifier-jobs/{id}', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns forbidden error', async () => {
    const { job5 } = await seedTestData()
    const response = await request(app).get(`/${job5.id}`)

    expect(response.statusCode).toBe(403)
  })

  test('returns empty error', async () => {
    const response = await request(app).get('/230000123')

    expect(response.statusCode).toBe(404)
  })

  test('returns successfully', async () => {
    const { job1 } = await seedTestData()
    const response = await request(app).get(`/${job1.id}`)

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.id).toBe(job1.id)
    expect(result.id).toBe(job1.id)
    expect(result.projectId).toBe(job1.projectId)
    expect(result.minutesCompleted).toBe(job1.minutesCompleted)
    expect(result.minutesTotal).toBe(job1.minutesTotal)
    expect(result.createdAt).toBe(job1.createdAt.toISOString())
    expect(result.completedAt).toBe(job1.completedAt)
    expect(result.classifier.id).toBe(CLASSIFIER_1.id)
    expect(result.classifier.name).toBe(CLASSIFIER_1.name)
  })

  test('customizable fields', async () => {
    const { job1 } = await seedTestData()
    const response = await request(app).get(`/${job1.id}`).query({ fields: ['minutes_completed', 'minutes_total', 'query_streams'] })

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result.id).toBeUndefined()
    expect(result.projectId).toBe(job1.projectId)
    expect(result.minutesCompleted).toBe(job1.minutesCompleted)
    expect(result.minutesTotal).toBe(job1.minutesTotal)
    expect(result.queryStreams).toBe(job1.queryStreams)
    expect(result.createdAt).toBeUndefined()
    expect(result.completedAt).toBeUndefined()
    expect(result.classifier).toBeUndefined()
  })
})