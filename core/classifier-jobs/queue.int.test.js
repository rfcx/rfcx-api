const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await commonSetup()
})

async function commonSetup () {
  const PROJECT = { id: 'testproject1', name: 'Test project 1', createdById: seedValues.otherUserId }
  const PROJECT_2 = { id: 'testproject2', name: 'Test project 2', createdById: seedValues.otherUserId }
  const PROJECT_3 = { id: 'testproject3', name: 'Test project 3', createdById: seedValues.primaryUserId }
  const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Classifier job test', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT.id }
  const STREAM_2 = { id: 'LilSjZJkRK21', name: 'Classifier job test 2', start: '2021-02-01T01:00:00.000Z', end: '2021-03-01T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT.id }
  const STREAM_3 = { id: 'LilSjZJkRK22', name: 'Classifier job test 2', start: '2021-02-01T01:00:00.000Z', end: '2021-03-01T05:00:00.000Z', isPublic: true, createdById: seedValues.anotherUserId, projectId: PROJECT.id }
  const JOB_1 = { projectId: PROJECT.id, queryStreams: 'Classifier job test,Classifier job test 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
  const JOB_2 = { projectId: PROJECT.id, queryStreams: 'Classifier job test', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', segmentsTotal: 4, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
  const JOB_3 = { projectId: PROJECT_2.id, queryStreams: 'Classifier job test 3', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.otherUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
  const JOB_4 = { projectId: PROJECT_3.id, queryStreams: 'Classifier job test 4', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.primaryUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
  await models.Project.bulkCreate([PROJECT, PROJECT_2, PROJECT_3])
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest })
  await models.Stream.bulkCreate([STREAM_1, STREAM_2, STREAM_3])
  await models.ClassifierJob.bulkCreate([JOB_1, JOB_2, JOB_3, JOB_4])
}

describe('GET /classifier-jobs/queue', () => {
  test('returns successfully', async () => {
    const response = await request(app).get('/queue')

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

    const response = await request(app).get('/queue').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })

  test('return waiting jobs without status is equal 0 to the filter', async () => {
    const response = await request(app).get('/queue')
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })

  test('return different status in the fiels', async () => {
    const query = {
      status: 30
    }

    const response = await request(app).get('/queue').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.total).toEqual(2)
  })
})
