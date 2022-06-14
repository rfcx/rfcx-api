const routes = require('.')
const models = require('../../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../../common/testing/sequelize')
const request = require('supertest')

const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproject1', name: 'Test project 1', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testproject2', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testproject3', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3]

const JOB_1 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Classifier job test,Classifier job test 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_1.id, queryStreams: 'Classifier job test', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', segmentsTotal: 4, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_2.id, queryStreams: 'Classifier job test 3', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.otherUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { classifierId: CLASSIFIER_1.id, projectId: PROJECT_3.id, queryStreams: 'Classifier job test 4', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.primaryUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4]

async function seedTestData () {
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest })
  await models.ClassifierJob.bulkCreate(JOBS)
}

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})

beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

describe('GET /internal/classifier-jobs/count', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns successfully', async () => {
    const response = await request(app).get('/count')

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result).toBeDefined()
    expect(typeof result === 'object').toBe(true)
    expect(Object.keys(result)[0]).toEqual('total')
  })

  test('can set status field', async () => {
    const query = {
      status: 0
    }

    const response = await request(app).get('/count').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })

  test('return waiting jobs without status is equal 0 to the filter', async () => {
    const response = await request(app).get('/count')
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })

  test('return different status in the field', async () => {
    const query = {
      status: 30
    }

    const response = await request(app).get('/count').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })
})
