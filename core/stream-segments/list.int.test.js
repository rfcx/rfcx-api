const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const moment = require('moment')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  const audioFileFormat = { id: 1, value: 'wav' }
  await models.AudioFileFormat.create(audioFileFormat)
  const audioCodec = { id: 1, value: 'wav' }
  await models.AudioCodec.create(audioCodec)
  const fileExtension = { id: 1, value: '.wav' }
  await models.FileExtension.create(fileExtension)
  const project = (await models.Project.findOrCreate({ where: { id: 'foo', name: 'my project', createdById: seedValues.primaryUserId } }))[0]
  const stream1 = await models.Stream.create({ id: 'j123k', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id })
  const stream2 = await models.Stream.create({ id: 'opqw1', name: 'Jaguar Station 2', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id })
  const classifier1 = await models.Classifier.create({ externalId: 'cccddd', name: 'chainsaw model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something' })
  const classifier2 = await models.Classifier.create({ externalId: 'fffbbb', name: 'vehicle model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something2' })
  const classifier3 = await models.Classifier.create({ externalId: 'zzzvvv', name: 'gunshot model', version: 1, createdById: seedValues.primaryUserId, modelRunner: 'tf2', modelUrl: 's3://something3' })
  const job1 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:10', classifierId: classifier1.id, projectId: project.id, createdById: seedValues.primaryUserId })
  const job2 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:12', classifierId: classifier1.id, projectId: project.id, createdById: seedValues.primaryUserId })
  const job3 = await models.ClassifierJob.create({ created_at: '2022-01-02 04:14', classifierId: classifier2.id, projectId: project.id, createdById: seedValues.primaryUserId })
  return { project, stream1, stream2, classifier1, classifier2, classifier3, job1, job2, job3 }
}

describe('GET /streams/:id/segments', () => {
  test('stream not found', async () => {
    const response = await request(app).get('/xyz/segments').query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z' })

    expect(response.statusCode).toBe(404)
  })

  test('stream not readable by user', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.otherUserId })

    const response = await request(app).get(`/${stream.id}/segments`).query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z' })

    expect(response.statusCode).toBe(403)
  })

  test('segments not found', async () => {
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })

    const response = await request(app).get(`/${stream.id}/segments`).query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual([])
  })

  test('single result', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    const segment = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10.000Z', end: '2021-07-26T10:12:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })

    const response = await request(app).get(`/${stream.id}/segments`).query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:09.999Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
    expect(response.body[0].id).toBe(segment.id)
    expect(moment(response.body[0].start).toDate()).toEqual(segment.start)
    expect(moment(response.body[0].end).toDate()).toEqual(segment.end)
    expect(response.body[0].file_extension).toBe('.wav')
  })

  test('result when segment covers start/end (strict: false)', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })

    const response = await request(app).get(`/${stream.id}/segments`).query({ strict: 'false', start: '2021-07-26T10:10:20Z', end: '2021-07-26T10:10:50Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })

  test('result when start equals end', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'j123s', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })

    const response = await request(app).get(`/${stream.id}/segments`).query({ start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:10:10Z' })

    expect(response.statusCode).toBe(200)
    expect(response.body.length).toBe(1)
  })
  test('returns correct unprocessed segments', async () => {
    const { stream1, classifier1, classifier2, classifier3, job1, job2, job3 } = await commonSetup()

    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream1.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    const s1 = await models.StreamSegment.create({ stream_id: stream1.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:10.000Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    const s2 = await models.StreamSegment.create({ stream_id: stream1.id, start: '2021-07-26T10:11:10.000Z', end: '2021-07-26T10:12:10.000Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    const s3 = await models.StreamSegment.create({ stream_id: stream1.id, start: '2021-07-26T10:12:10.000Z', end: '2021-07-26T10:13:10.000Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    const s4 = await models.StreamSegment.create({ stream_id: stream1.id, start: '2021-07-26T10:13:10.000Z', end: '2021-07-26T10:14:10.000Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })
    const s5 = await models.StreamSegment.create({ stream_id: stream1.id, start: '2021-07-26T10:14:10.000Z', end: '2021-07-26T10:15:10.000Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: 1 })

    await models.ClassifierProcessedSegment.create({ classifierId: classifier1.id, classifierJobId: job1.id, streamId: stream1.id, start: s1.start })
    await models.ClassifierProcessedSegment.create({ classifierId: classifier1.id, classifierJobId: job1.id, streamId: stream1.id, start: s2.start })
    await models.ClassifierProcessedSegment.create({ classifierId: classifier1.id, classifierJobId: job2.id, streamId: stream1.id, start: s3.start })
    await models.ClassifierProcessedSegment.create({ classifierId: classifier2.id, classifierJobId: job3.id, streamId: stream1.id, start: s1.start })

    const response1 = await request(app).get(`/${stream1.id}/segments`).query({ start: '2021-07-26T00:00:00.000Z', end: '2021-07-27T00:00:00.000Z', classifier: classifier1.id })
    expect(response1.body.length).toBe(2)
    expect(response1.body[0].id).toBe(s4.id)
    expect(response1.body[1].id).toBe(s5.id)

    const response2 = await request(app).get(`/${stream1.id}/segments`).query({ start: '2021-07-26T00:00:00.000Z', end: '2021-07-27T00:00:00.000Z', classifier: classifier2.id })
    expect(response2.body.length).toBe(4)
    expect(response2.body[0].id).toBe(s2.id)
    expect(response2.body[1].id).toBe(s3.id)
    expect(response2.body[2].id).toBe(s4.id)
    expect(response2.body[3].id).toBe(s5.id)

    const response3 = await request(app).get(`/${stream1.id}/segments`).query({ start: '2021-07-26T00:00:00.000Z', end: '2021-07-27T00:00:00.000Z', classifier: classifier3.id })
    expect(response3.body.length).toBe(5)
    expect(response3.body[0].id).toBe(s1.id)
    expect(response3.body[1].id).toBe(s2.id)
    expect(response3.body[2].id).toBe(s3.id)
    expect(response3.body[3].id).toBe(s4.id)
    expect(response3.body[4].id).toBe(s5.id)

    const response4 = await request(app).get(`/${stream1.id}/segments`).query({ start: s1.start, end: s3.start, classifier: classifier1.id })
    expect(response4.body.length).toBe(0)
  })
})
