const routes = require('./index')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues } = require('../../common/testing/sequelize')
const request = require('supertest')

const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT = { id: 'testproject1', name: 'Test project', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testproject2', name: 'Test project 2', createdById: seedValues.otherUserId }
const PROJECT_3 = { id: 'testproject3', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECT_4 = { id: 'testproject4', name: 'Test project 4', createdById: seedValues.anotherUserId }
const PROJECTS = [PROJECT, PROJECT_2, PROJECT_3, PROJECT_4]

const JOB_1 = { projectId: PROJECT.id, queryStreams: 'Test stream, Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { projectId: PROJECT.id, queryStreams: 'Test stream', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', segmentsTotal: 4, segmentsCompleted: 0, status: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { projectId: PROJECT_2.id, queryStreams: 'Test stream 2', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.otherUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { projectId: PROJECT_3.id, queryStreams: 'Test stream 3', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.primaryUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_5 = { projectId: PROJECT_4.id, queryStreams: 'Not accessible project', queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', segmentsTotal: 2, segmentsCompleted: 0, status: 30, createdById: seedValues.anotherUserId, createdAt: '2022-06-08T08:07:49.158Z', updatedAt: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5]

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
  await seedTestData()
})

async function seedTestData () {
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT.id, role_id: seedValues.roleMember })
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest })
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_3.id, role_id: seedValues.roleAdmin })
  await models.UserProjectRole.create({ user_id: seedValues.anotherUserId, project_id: PROJECT_4.id, role_id: seedValues.roleAdmin })
  await models.ClassifierJob.bulkCreate(JOBS)
}

describe('GET /classifier-jobs', () => {
  const app = expressApp()
  app.use('/', routes)

  test('returns successfully', async () => {
    const response = await request(app).get('/')

    const result = response.body
    expect(response.statusCode).toBe(200)
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  test('can set all fields', async () => {
    const query = {
      projects: [PROJECT.id],
      status: 0,
      created_by: 'me',
      limit: 2,
      offset: 0,
      sort: '-updated_at',
      fields: ['projectId', 'queryStreams']
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('not exist project', async () => {
    const query = {
      projects: ['testproject11']
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual('')
  })

  test('get correct classifiers jobs for one project', async () => {
    const query = {
      projects: [PROJECT.id]
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('get correct classifiers jobs for several projects', async () => {
    const query = {
      projects: [PROJECT.id, PROJECT_2.id]
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(3)
  })

  test('get correct classifiers jobs for exist and not exist projects', async () => {
    const query = {
      projects: [PROJECT.id, 'testproject22']
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('if project ids set, but empty (no accessible projects)', async () => {
    const query = {
      projects: [PROJECT_4.id]
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(0)
  })

  test('get correct classifiers jobs filtered by 30 (done) status', async () => {
    const query = {
      status: 30
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('sort option is working well', async () => {
    const query = {
      sort: '-updated_at'
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(4)
    expect(response.body[0].updated_at).toEqual('2022-10-07T08:07:49.158Z')
  })

  test('fields option is working well', async () => {
    const query = {
      fields: ['project_id', 'query_streams']
    }
    const expectedFields = ['projectId', 'queryStreams']

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(4)
    expectedFields.forEach(actualProperty => expect(Object.keys(response.body[0])).toContain(actualProperty))
  })

  test('created_by filter is working well', async () => {
    const query = {
      created_by: 'me'
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(1)
    expect(response.body[0].projectId).toEqual('testproject3')
  })
})
