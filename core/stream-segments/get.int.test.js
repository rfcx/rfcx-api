const routes = require('.')
const models = require('../_models')
const { expressApp, seedValues, muteConsole, truncateNonBase } = require('../../common/testing/sequelize')
const request = require('supertest')
const moment = require('moment')

const app = expressApp()

let format, codec, extension

app.use('/', routes)

beforeAll(async () => {
  muteConsole('warn')
})

beforeEach(async () => {
  await commonSetup()
})

afterEach(async () => {
  await truncateNonBase(models)
})

afterAll(async () => {
  await models.sequelize.close()
})

async function commonSetup () {
  format = (await models.AudioFileFormat.findOrCreate({ where: { value: 'wav' } }))[0]
  codec = (await models.AudioCodec.findOrCreate({ where: { value: 'wav' } }))[0]
  extension = (await models.FileExtension.findOrCreate({ where: { value: '.wav' } }))[0]
}

describe('GET /streams/:id/segments/:start', () => {
  test('stream not found', async () => {
    const response = await request(app).get('/xyz/segments/20210726T112233500Z')

    expect(response.statusCode).toBe(404)
  })

  test('stream not readable by user', async () => {
    // await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua1', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.otherUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010000Z`)

    expect(response.statusCode).toBe(403)
  })

  test('segment not found', async () => {
    const stream = await models.Stream.create({ id: 'jagua2', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })

    const response = await request(app).get(`/${stream.id}/segments/20210726T112233500Z`)

    expect(response.statusCode).toBe(404)
  })

  test('segment found matching start exactly', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua3', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10.000Z', end: '2021-07-26T10:12:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010000Z`)

    expect(response.statusCode).toBe(200)
  })

  test('segment found matching within start/end (strict: false)', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua4', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101020000Z`).query({ strict: 'false' })

    expect(response.statusCode).toBe(200)
  })

  test('segment found when no milliseconds', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua5', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010Z`)

    expect(response.statusCode).toBe(200)
  })

  test('segment found with default fields', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua6', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    const segment = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010000Z`)

    expect(Object.keys(response.body).length).toBe(5)
    expect(response.body.id).toBe(segment.id)
    expect(moment(response.body.start).toDate()).toEqual(segment.start)
    expect(moment(response.body.end).toDate()).toEqual(segment.end)
    expect(response.body.file_extension).toBe('.wav')
    expect(response.body.stream_source_file.id).toBe(sourceFile.id)
  })

  test('segment found with custom fields', async () => {
    await commonSetup()
    const stream = await models.Stream.create({ id: 'jagua7', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: codec.id, audio_file_format_id: format.id })
    const segment = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10.000Z', end: '2021-07-26T10:11:09.999Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: extension.id, availability: 1 })

    const response = await request(app).get(`/${stream.id}/segments/20210726T101010000Z`).query({ fields: ['sample_count', 'file_extension'] })

    expect(Object.keys(response.body).length).toBe(2)
    expect(response.body.file_extension).toBe('.wav')
    expect(response.body.sample_count).toBe(segment.sample_count)
  })
})
