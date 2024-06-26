const routes = require('./index')
const models = require('../_models')
const { expressApp, seedValues, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const { WAITING, DONE, AWAITING_CANCELLATION } = require('./classifier-job-status')

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
    const job1 = result.find(p => p.id === JOB_1.id)
    expect(job1).toBeDefined()
    expect(job1.projectId).toBe(JOB_1.projectId)
    expect(job1.minutesCompleted).toBe(JOB_1.minutesCompleted)
    expect(job1.minutesTotal).toBe(JOB_1.minutesTotal)
    expect(job1.createdAt).toBeDefined()
    expect(job1.completedAt).toBe(JOB_1.completedAt)
    expect(job1.classifier.id).toBe(CLASSIFIER_1.id)
    expect(job1.classifier.name).toBe(CLASSIFIER_1.name)
    expect(job1.streams).toBeDefined()
    expect(job1.streams.length).toBe(2)
    expect(job1.streams[0].id).toBe(STREAM_1.id)
    expect(job1.streams[0].name).toBe(STREAM_1.name)
    expect(job1.streams[1].id).toBe(STREAM_2.id)
    expect(job1.streams[1].name).toBe(STREAM_2.name)
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

  test('picks the newest awaiting canncellation job', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Older job
    await models.ClassifierJob.create({ created_at: '2022-01-02 03:15', updatedAt: '2022-01-02 03:15', classifierId, projectId, createdById: seedValues.otherUserId, status: AWAITING_CANCELLATION })
    // Newer job
    const secondJob = await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', updatedAt: '2022-01-02 04:10', classifierId, projectId, createdById: seedValues.otherUserId, status: AWAITING_CANCELLATION })

    const response = await request(app).get('/').query({ status: AWAITING_CANCELLATION })
    expect(response.body).toHaveLength(2)
    expect(response.body[0].id).toBe(secondJob.id)
  })

  test('does not return non-cancel jobs', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel job
    const firstJob = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, queryStreams: 'RAG4,RAG5,RAG1*', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })
    // Running job
    await models.ClassifierJob.create({ status: DONE, classifierId, projectId, queryStreams: 'GUG1', queryStart: '2021-03-13', queryEnd: '2022-04-01', createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ status: AWAITING_CANCELLATION, limit: '2' })

    expect(response.body).toHaveLength(1)
    expect(response.body[0].id).toBe(firstJob.id)
  })

  test('respects limit', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ status: AWAITING_CANCELLATION, limit: '2' })

    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('3')
  })

  test('respects offset', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ status: AWAITING_CANCELLATION, offset: '2' })

    expect(response.body).toHaveLength(1)
    expect(response.headers['total-items']).toBe('3')
  })

  test('respects sort', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ status: AWAITING_CANCELLATION, sort: '-created_at' })

    expect(response.body).toHaveLength(3)
    expect(response.headers['total-items']).toBe('3')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
    expect(response.body[2].id).toBe(job1.id)
  })

  test('respects query_streams 1', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ queryStreams: 'stream1', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_streams: 'stream1' })
    expect(response.body).toHaveLength(3)
    expect(response.headers['total-items']).toBe('3')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
    expect(response.body[2].id).toBe(job1.id)
  })

  test('respects query_streams 2', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_streams: 'stream2' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
  })

  test('respects query_streams 3', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_streams: 'stream3' })
    expect(response.body).toHaveLength(1)
    expect(response.headers['total-items']).toBe('1')
    expect(response.body[0].id).toBe(job3.id)
  })

  test('respects query_streams 4', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_streams: 'stream2,stream3' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
  })

  test('respects query_start 1', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_start: '2024-01-01' })
    expect(response.body).toHaveLength(1)
    expect(response.headers['total-items']).toBe('1')
    expect(response.body[0].id).toBe(job1.id)
  })

  test('respects query_start 2', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_start: '2024-01-02' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job2.id)
    expect(response.body[1].id).toBe(job1.id)
  })

  test('respects query_start 3', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_start: '2024-01-03' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
  })

  test('respects query_end 1', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_end: '2024-01-05' })
    expect(response.body).toHaveLength(0)
  })

  test('respects query_end 2', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job3 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_end: '2024-01-03' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job3.id)
    expect(response.body[1].id).toBe(job2.id)
  })

  test('respects query_end 3', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_end: '2024-01-02' })
    expect(response.body).toHaveLength(2)
    expect(response.headers['total-items']).toBe('2')
    expect(response.body[0].id).toBe(job2.id)
    expect(response.body[1].id).toBe(job1.id)
  })

  test('respects query_hours 1', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    const job1 = await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', queryHours: '1-3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', queryHours: '9-14', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', queryHours: '20-22', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response1 = await request(app).get('/').query({ query_hours: '1' })

    expect(response1.body).toHaveLength(4)
    expect(response1.headers['total-items']).toBe('4')
    expect(response1.body[0].id).toBe(job1.id)

    const response2 = await request(app).get('/').query({ query_hours: '2-3' })

    expect(response2.body).toHaveLength(4)
    expect(response2.headers['total-items']).toBe('4')
    expect(response2.body[0].id).toBe(job1.id)

    const response3 = await request(app).get('/').query({ query_hours: '3' })

    expect(response3.body).toHaveLength(1)
    expect(response3.headers['total-items']).toBe('1')
    expect(response3.body[0].id).toBe(job1.id)
  })

  test('respects query_hours 2', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', queryHours: '1-3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', queryHours: '9-14', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', queryHours: '20-22', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response1 = await request(app).get('/').query({ query_hours: '9' })

    expect(response1.body).toHaveLength(1)
    expect(response1.headers['total-items']).toBe('1')
    expect(response1.body[0].id).toBe(job2.id)

    const response2 = await request(app).get('/').query({ query_hours: '9-10' })

    expect(response2.body).toHaveLength(1)
    expect(response2.headers['total-items']).toBe('1')
    expect(response2.body[0].id).toBe(job2.id)

    const response3 = await request(app).get('/').query({ query_hours: '13-19' })

    expect(response3.body).toHaveLength(2)
    expect(response3.headers['total-items']).toBe('2')
    expect(response3.body[0].id).toBe(job2.id)
    expect(response3.body[1].id).toBe(JOB_2.id)
  })

  test('respects all queries params', async () => {
    const classifierId = CLASSIFIER_1.id
    const projectId = PROJECT_1.id
    // Waiting cancel jobs (3)
    await models.ClassifierJob.create({ queryStreams: 'stream1', queryStart: '2024-01-01', queryEnd: '2024-01-02', queryHours: '1-3', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    const job2 = await models.ClassifierJob.create({ queryStreams: 'stream1,stream2', queryStart: '2024-01-02', queryEnd: '2024-01-03', queryHours: '9-14', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })
    await models.ClassifierJob.create({ queryStreams: 'stream1,stream2,stream3', queryStart: '2024-01-03', queryEnd: '2024-01-04', queryHours: '20-22', status: AWAITING_CANCELLATION, classifierId, projectId, createdById: seedValues.otherUserId })

    const response = await request(app).get('/').query({ query_streams: 'stream2', query_start: '2024-01-02', query_end: '2024-01-02', query_hours: '2-4,5-8,12-14,16,17' })

    expect(response.body).toHaveLength(1)
    expect(response.headers['total-items']).toBe('1')
    expect(response.body[0].id).toBe(job2.id)
  })
})
