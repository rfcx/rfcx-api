const routes = require('.')
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
  const STREAM_1 = { id: 'LilSjZJkRK20', name: 'Classifier job test', start: '2021-01-02T01:00:00.000Z', end: '2021-01-02T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT.id }
  const STREAM_2 = { id: 'LilSjZJkRK21', name: 'Classifier job test 2', start: '2021-02-01T01:00:00.000Z', end: '2021-03-01T05:00:00.000Z', isPublic: true, createdById: seedValues.otherUserId, projectId: PROJECT.id }
  await models.Project.create(PROJECT)
  await models.UserProjectRole.create({ user_id: seedValues.primaryUserId, project_id: PROJECT.id, role_id: seedValues.roleMember })
  await models.Stream.create(STREAM_1)
  await models.Stream.create(STREAM_2)
  await models.AudioFileFormat.create({ id: 1, value: 'wav' })
  await models.AudioCodec.create({ id: 1, value: 'wav' })
  await models.FileExtension.create({ id: 1, value: '.wav' })
  const SOURCE_FILE = await models.StreamSourceFile.create({ stream_id: STREAM_1.id, filename: '20210102_010000.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
  const SOURCE_FILE_2 = await models.StreamSourceFile.create({ stream_id: STREAM_1.id, filename: '20210102_020000.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
  const SEGMENT = { stream_id: STREAM_1.id, start: '2021-01-02T01:00:00.000Z', end: '2021-03-01T01:01:00.000Z', stream_source_file_id: SOURCE_FILE.id, sample_count: 720000, file_extension_id: 1 }
  const SEGMENT_2 = { stream_id: STREAM_1.id, start: '2021-01-02T02:00:00.000Z', end: '2021-01-02T02:01:00.000Z', stream_source_file_id: SOURCE_FILE_2.id, sample_count: 720000, file_extension_id: 1 }
  await models.StreamSegment.create(SEGMENT)
  await models.StreamSegment.create(SEGMENT_2)
}

describe('POST /classifiers-jobs', () => {
  test('job created and location header returns an integer id', async () => {
    const requestBody = {
      project_id: 'testproject1'
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
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20',
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query streams are null', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_start: '2021-01-02',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('start date is null', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20',
      query_end: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('end date is null', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20',
      query_start: '2021-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours are null', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20',
      query_start: '2021-01-02',
      query_end: '2021-01-02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query date range is empty', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20',
      query_start: '2020-01-02',
      query_end: '2020-01-02',
      query_hours: '1,2'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('user is not project member', async () => {
    const requestBody = {
      project_id: 'testproject2',
      query_streams: 'LilSjZJkRK23'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('user token is expired', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_streams: 'LilSjZJkRK20'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('query hours with correct format', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_hours: '01,02'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(201)
  })

  test('query hours with not correct format', async () => {
    const requestBody = {
      project_id: 'testproject1',
      query_hours: '27,28'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })

  test('missing project id', async () => {
    const requestBody = {
      query_streams: ['LilSjZJkRK20']
    }
    console.warn = jest.fn()

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
    expect(console.warn).toHaveBeenCalled()
  })

  test('returns 400 when project id length is not correct', async () => {
    const requestBody = {
      project_id: 'abcdef12345'
    }

    const response = await request(app).post('/').send(requestBody)

    expect(response.statusCode).toBe(400)
  })

  test('returns 400 when project id is not exist', async () => {
    const requestBody = {
      project_id: 'abcdef123456'
    }

    const response = await request(app).post('/').send(requestBody)
    expect(response.statusCode).toBe(400)
  })
})
