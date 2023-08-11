const request = require('supertest')
const routes = require('./index')
const models = require('../../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole('warn')
})
afterEach(async () => {
  await truncateNonBase(models)
})
afterAll(async () => {
  await truncateNonBase(models)
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
  const stream = await models.Stream.create({ id: 'j123k', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id })
  return { audioFileFormat, audioCodec, fileExtension, project, stream }
}

describe('GET stream-source-file/:id', () => {
  test('returns 404 when no stream found', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get('/streams/abc/stream-source-file').query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(404)
    expect(response.body.message).toBe('stream with given id doesn\'t exist.')
  })
  test('returns 403 when there is another segment with same timestamp', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759d', start: segment1.start })

    expect(response.statusCode).toBe(403)
    expect(response.body.message).toBe('There is another file with the same timestamp in the stream.')
  })
  test('receives stream source with 1 available stream segment assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    const segment2 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
    expect(response.body.segments.length).toBe(2)
    expect(response.body.segments[0].start).toBe(segment1.start.toISOString())
    expect(response.body.segments[0].availability).toBe(segment1.availability)
    expect(response.body.segments[1].start).toBe(segment2.start.toISOString())
    expect(response.body.segments[1].availability).toBe(segment2.availability)
  })
  test('receives stream source with 1 unavailable stream segment assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
  test('receives stream source with 1 unavailable and 1 available stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
  test('receives stream source with 1 unavailable and 2 available stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
  test('receives stream source with 1 unavailable and 1 available and 1 cold storage stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 2 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
  test('receives stream source with 1 unavailable and 1 cold storage stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 2 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
  test('receives stream source with 1 available and 1 cold storage stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    const segment2 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 2 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 2 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment2.availability)
  })
  test('receives stream source with 2 available stream segments assigned', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id, sha1_checksum: 'b37530881c7ffd9edfd8f7feb131ae4563e3759f' })
    const segment1 = await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const response = await request(app).get(`/streams/${stream.id}/stream-source-file`).query({ sha1_checksum: sourceFile.sha1_checksum, start: segment1.start })

    expect(response.statusCode).toBe(200)
    expect(response.body.id).toBe(sourceFile.id)
    expect(response.body.filename).toBe(sourceFile.filename)
    expect(response.body.duration).toBe(sourceFile.duration)
    expect(response.body.sample_rate).toBe(sourceFile.sample_rate)
    expect(response.body.availability).toBe(segment1.availability)
  })
})
