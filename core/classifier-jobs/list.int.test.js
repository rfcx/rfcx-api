const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
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
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5]

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
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.primaryUserId, project_id: PROJECT_3.id, role_id: seedValues.roleAdmin } })
  await models.UserProjectRole.findOrCreate({ where: { user_id: seedValues.anotherUserId, project_id: PROJECT_4.id, role_id: seedValues.roleAdmin } })
  for (const job of JOBS) {
    await models.ClassifierJob.findOrCreate({ where: job })
  }
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
      projects: [PROJECT_1.id],
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
      projects: [PROJECT_1.id]
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('get correct classifiers jobs for several projects', async () => {
    const query = {
      projects: [PROJECT_1.id, PROJECT_2.id]
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(3)
  })

  test('get correct classifiers jobs for exist and not exist projects', async () => {
    const query = {
      projects: [PROJECT_1.id, 'testproject22']
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

  test('get correct classifiers jobs filtered by WAITING (0) status', async () => {
    const query = {
      status: WAITING
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
  })

  test('get correct classifiers jobs filtered by DONE (30) status', async () => {
    const query = {
      status: DONE
    }

    const response = await request(app).get('/').query(query)
    expect(response.statusCode).toBe(200)
    expect(response.body.length).toEqual(2)
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
    expect(response.body[0].projectId).toEqual(PROJECT_3.id)
  })
})
