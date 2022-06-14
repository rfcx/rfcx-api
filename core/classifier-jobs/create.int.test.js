const routes = require('.')
const models = require('../_models')
const { migrate, truncate, expressApp, seed, seedValues, muteConsole } = require('../../common/testing/sequelize')
const request = require('supertest')

const CLASSIFIER_1 = { id: 555, name: 'sounds of the underground', version: 1, externalId: '555666', createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: '???', lastExecutedAt: null, isPublic: true }
const CLASSIFIERS = [CLASSIFIER_1]

const PROJECT_1 = { id: 'testproject1', name: 'Test project 1', createdById: seedValues.otherUserId }
const PROJECTS = [PROJECT_1]

async function seedTestData () {
  await models.Classifier.bulkCreate(CLASSIFIERS)
  await models.Project.bulkCreate(PROJECTS)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT_1.id, role_id: seedValues.roleMember })
}

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
  muteConsole('warn')
})

beforeEach(async () => {
  await truncate(models)
  await seedTestData()
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
      query_streams: 'LilSjZJkRK20',
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
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
      query_streams: 'LilSjZJkRK20',
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
      query_streams: 'LilSjZJkRK20',
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
      query_streams: 'LilSjZJkRK20',
      query_start: '2021-01-02',
      query_end: '2021-01-02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query date range is empty', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_streams: 'LilSjZJkRK20',
      query_start: '2020-01-02',
      query_end: '2020-01-01',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('user is not project member', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: 'testproject2',
      query_streams: 'LilSjZJkRK23'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('query hours with correct format', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '01,02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with not correct format', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: PROJECT_1.id,
      query_hours: '27,28'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('missing project id', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      query_streams: ['LilSjZJkRK20']
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })

  test('returns 400 when project id length is not correct', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: 'abcdef12345'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when project id is not exist', async () => {
    const requestBody = {
      classifier_id: CLASSIFIER_1.id,
      project_id: 'abcdef123456'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })
})
