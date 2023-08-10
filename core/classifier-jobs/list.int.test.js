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

const ROLE_1 = { user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember }
const ROLE_2 = { user_id: seedValues.primaryUserId, project_id: PROJECT_2.id, role_id: seedValues.roleGuest }
const ROLE_3 = { user_id: seedValues.primaryUserId, project_id: PROJECT_3.id, role_id: seedValues.roleAdmin }
const ROLE_4 = { user_id: seedValues.anotherUserId, project_id: PROJECT_4.id, role_id: seedValues.roleAdmin }
const ROLES = [ROLE_1, ROLE_2, ROLE_3, ROLE_4]

const STREAM_1 = { id: 'rrr0stream01', name: 'Test stream', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_2 = { id: 'rrr0stream02', name: 'Test stream 2', projectId: PROJECT_1.id, createdById: PROJECT_1.createdById }
const STREAM_3 = { id: 'rrr0stream03', name: 'Test stream 3', projectId: PROJECT_2.id, createdById: PROJECT_1.createdById }
const STREAM_4 = { id: 'rrr0stream04', name: 'Test stream 4', projectId: PROJECT_3.id, createdById: PROJECT_1.createdById }
const STREAM_5 = { id: 'rrr0stream05', name: 'Test stream 5', projectId: PROJECT_4.id, createdById: PROJECT_1.createdById }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3, STREAM_4, STREAM_5]

const JOB_1 = { id: 9001, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}, ${STREAM_2.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-09-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_2 = { id: 9002, classifierId: CLASSIFIER_1.id, projectId: STREAM_1.projectId, status: WAITING, queryStreams: `${STREAM_1.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '11,13', minutesTotal: 4, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-10-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_3 = { id: 9003, classifierId: CLASSIFIER_1.id, projectId: STREAM_3.projectId, status: DONE, queryStreams: `${STREAM_3.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.otherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_4 = { id: 9004, classifierId: CLASSIFIER_1.id, projectId: STREAM_4.projectId, status: DONE, queryStreams: `${STREAM_4.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.primaryUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOB_5 = { id: 9005, classifierId: CLASSIFIER_1.id, projectId: STREAM_5.projectId, status: DONE, queryStreams: `${STREAM_5.name}`, queryStart: '2021-03-13', queryEnd: '2022-04-01', queryHours: '1,2', minutesTotal: 2, minutesCompleted: 0, createdById: seedValues.anotherUserId, created_at: '2022-06-08T08:07:49.158Z', updated_at: '2022-07-07T08:07:49.158Z', startedAt: null, completedAt: null }
const JOBS = [JOB_1, JOB_2, JOB_3, JOB_4, JOB_5]

const CLASSIFIER_JOB_1_STREAM_1 = { classifierJobId: JOB_1.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_1_STREAM_2 = { classifierJobId: JOB_1.id, streamId: STREAM_2.id }
const CLASSIFIER_JOB_2_STREAM_1 = { classifierJobId: JOB_2.id, streamId: STREAM_1.id }
const CLASSIFIER_JOB_3_STREAM_1 = { classifierJobId: JOB_3.id, streamId: STREAM_3.id }
const CLASSIFIER_JOB_4_STREAM_1 = { classifierJobId: JOB_4.id, streamId: STREAM_4.id }
const CLASSIFIER_JOB_5_STREAM_1 = { classifierJobId: JOB_5.id, streamId: STREAM_5.id }
const CLASSIFIER_JOB_STREAMS = [CLASSIFIER_JOB_1_STREAM_1, CLASSIFIER_JOB_1_STREAM_2, CLASSIFIER_JOB_2_STREAM_1, CLASSIFIER_JOB_3_STREAM_1, CLASSIFIER_JOB_4_STREAM_1, CLASSIFIER_JOB_5_STREAM_1]

beforeEach(async () => {
  await seedTestData()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

async function seedTestData () {
  await models.Classifier.create(CLASSIFIER_1)
  await models.Project.bulkCreate(PROJECTS)
  await models.Stream.bulkCreate(STREAMS)
  await models.UserProjectRole.bulkCreate(ROLES)
  await models.ClassifierJob.bulkCreate(JOBS)
  await models.ClassifierJobStream.bulkCreate(CLASSIFIER_JOB_STREAMS)
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
    expect(result.length).toBe(4)
    expect(result[0].projectId).toBe(JOB_1.projectId)
    expect(result[0].minutesCompleted).toBe(JOB_1.minutesCompleted)
    expect(result[0].minutesTotal).toBe(JOB_1.minutesTotal)
    expect(result[0].createdAt).toBeDefined()
    expect(result[0].completedAt).toBe(JOB_1.completedAt)
    expect(result[0].classifier.id).toBe(CLASSIFIER_1.id)
    expect(result[0].classifier.name).toBe(CLASSIFIER_1.name)
    expect(result[0].streams).toBeDefined()
    expect(result[0].streams.length).toBe(2)
    expect(result[0].streams[0].id).toBe(STREAM_1.id)
    expect(result[0].streams[0].name).toBe(STREAM_1.name)
    expect(result[0].streams[1].id).toBe(STREAM_2.id)
    expect(result[0].streams[1].name).toBe(STREAM_2.name)
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
    expect(response.body).toEqual([])
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
