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
})
