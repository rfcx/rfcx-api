const routes = require('.')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')

const CLASSIFIER_1 = { id: 912, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproj0001', name: 'Test project 1', createdById: seedValues.otherUserId }
const PROJECT_2 = { id: 'testproj0002', name: 'Test project 2', createdById: seedValues.anotherUserId }
const PROJECT_3 = { id: 'testproj0003', name: 'Test project 3', createdById: seedValues.primaryUserId }
const PROJECTS = [PROJECT_1, PROJECT_2, PROJECT_3]

const STREAM_1 = { id: 'LilSjZJkRK40', name: 'Stream 1', projectId: PROJECT_1.id, createdById: seedValues.otherUserId }
const STREAM_2 = { id: 'LilSjZJkRK41', name: 'Stream 2', projectId: PROJECT_2.id, createdById: seedValues.anotherUserId }
const STREAM_3 = { id: 'LilSjZJkRK42', name: 'Stream 3', projectId: PROJECT_3.id, createdById: seedValues.primaryUserId }
const STREAM_4 = { id: 'LilSjZJkRK43', name: 'Stream 4', projectId: PROJECT_3.id, createdById: seedValues.primaryUserId }
const STREAM_5 = { id: 'LilSjZJkRK44', name: 'Stream 5', projectId: PROJECT_3.id, createdById: seedValues.primaryUserId }
const STREAMS = [STREAM_1, STREAM_2, STREAM_3, STREAM_4, STREAM_5]

async function seedTestData () {
  await await models.Classifier.bulkCreate(CLASSIFIERS)
  await await models.Project.bulkCreate(PROJECTS)
  await await models.Stream.bulkCreate(STREAMS)
  await models.UserProjectRole.bulkCreate(PROJECTS.map(project => { return { project_id: project.id, user_id: project.createdById, role_id: seedValues.roleOwner } }))
  await models.UserStreamRole.bulkCreate(STREAMS.map(stream => { return { stream_id: stream.id, user_id: stream.createdById, role_id: seedValues.roleOwner } }))
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember })
}

beforeAll(async () => {
  muteConsole('warn')
})
beforeEach(async () => {
  await seedTestData()
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await models.sequelize.close()
})

describe('POST /classifiers-jobs', () => {
  const app = expressApp()
  app.use('/', routes)

  test('job created and location header returns an integer id', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(201)
    expect(response.header.location).toMatch(/^\/classifier-jobs\/[0-9]+$/)
    const id = response.header.location.replace('/classifier-jobs/', '')
    const job = await models.ClassifierJob.findByPk(id)
    expect(job.project_id).toBe(requestBody.project_id)
  })

  test('can set all fields', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.name,
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
    const jobs = await models.ClassifierJob.findAll()
    expect(jobs.length).toBe(1)
    expect(jobs[0].classifierId).toBe(requestBody.classifier_id)
    expect(jobs[0].projectId).toBe(requestBody.project_id)
    expect(jobs[0].queryStreams).toBe(requestBody.query_streams)
    expect(jobs[0].queryStart).toBe(requestBody.query_start)
    expect(jobs[0].queryEnd).toBe(requestBody.query_end)
    expect(jobs[0].queryHours).toBe(requestBody.query_hours)
    const jobStreams = await models.ClassifierJobStream.findAll()
    expect(jobStreams.length).toBe(1)
    expect(jobStreams[0].classifierJobId).toBe(jobs[0].id)
    expect(jobStreams[0].streamId).toBe(STREAM_1.id)
  })

  test('works with stream ids in query_streams', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.id,
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
    const jobs = await models.ClassifierJob.findAll()
    expect(jobs.length).toBe(1)
    expect(jobs[0].classifierId).toBe(requestBody.classifier_id)
    expect(jobs[0].projectId).toBe(requestBody.project_id)
    expect(jobs[0].queryStreams).toBe(requestBody.query_streams)
    expect(jobs[0].queryStart).toBe(requestBody.query_start)
    expect(jobs[0].queryEnd).toBe(requestBody.query_end)
    expect(jobs[0].queryHours).toBe(requestBody.query_hours)
    const jobStreams = await models.ClassifierJobStream.findAll()
    expect(jobStreams.length).toBe(1)
    expect(jobStreams[0].classifierJobId).toBe(jobs[0].id)
    expect(jobStreams[0].streamId).toBe(STREAM_1.id)
  })

  test('if query_streams is not set, assigns all streams from the projects', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_3.id,
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
    const jobs = await models.ClassifierJob.findAll()
    expect(jobs.length).toBe(1)
    const job = jobs[0]
    expect(job.classifierId).toBe(requestBody.classifier_id)
    expect(job.projectId).toBe(requestBody.project_id)
    expect(job.queryStreams).toBeNull()
    expect(job.queryStart).toBe(requestBody.query_start)
    expect(job.queryEnd).toBe(requestBody.query_end)
    expect(job.queryHours).toBe(requestBody.query_hours)
    const jobStreams = await models.ClassifierJobStream.findAll()
    expect(jobStreams.length).toBe(3)
    expect(jobStreams.every(s => s.classifierJobId === job.id)).toBeTruthy()
    const streamIds = jobStreams.map(s => s.streamId)
    expect(streamIds.includes(STREAM_3.id)).toBeTruthy()
    expect(streamIds.includes(STREAM_4.id)).toBeTruthy()
    expect(streamIds.includes(STREAM_5.id)).toBeTruthy()
  })

  test('can omit optional query_streams', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('can omit optional query_start', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.name,
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('can omit optional query_end', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.name,
      query_start: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('can omit optional query_hours', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.name,
      query_start: '2021-01-02',
      query_end: '2021-01-02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('400 if query_start after query_end', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: STREAM_1.name,
      query_start: '2020-01-02',
      query_end: '2020-01-01',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
    expect(response.text).toMatch(/query_start must be before query_end/)
  })

  test('user is not project member', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_2.id,
      query_streams: STREAM_2.name
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(403)
  })

  test('query hours with 1 digit format (midnight)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '0'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with 2 digit format (midnight)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '00'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with 1 digit format (daytime)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '9'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with 2 digit format (daytime)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '09'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with comma', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '01,02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with 1 digit format and hyphen', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '1-9'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with 2 digit format and hyphen', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '01-09'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with comma and hyphen', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '01,02,20-23'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with invalid time of day', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '27,28'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('query hours with invalid time of day (negative)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '-1'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('query hours with invalid time of day (ending with comma)', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '4-6,8,'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('missing project id', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      query_streams: STREAM_1.name
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when project id length is not correct', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: 'abcdef12345'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 404 when project not found', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: 'abcdef123456'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(404)
  })
  test('returns 404 when a single query stream not found', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: 'random111111'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('No streams found for the query')
  })
  test('returns 404 when all of the query streams not found', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: 'random111111,random222222'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('No streams found for the query')
  })
  test('returns 404 when one of the query streams not found', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: `${STREAM_1.name},randommmmmmm`
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('Some streams not found for the query')
  })
})
