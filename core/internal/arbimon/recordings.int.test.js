process.env.TRASHES_STREAM_ID = 'trashes00000'

const request = require('supertest')
const routes = require('../routes')
const models = require('../../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../../common/testing/sequelize')
const app = expressApp()

app.use('/', routes.arbimon)

let stream, trashesStream, audioFileFormat, audioCodec, fileExtension, testPayload, testRequestData, audioFileFormatId, audioCodecId, fileExtensionId
resetTestData()

beforeEach(async () => {
  await commonSetup()
})
beforeAll(async () => {
  muteConsole()
})
afterEach(async () => {
  await truncateNonBase(models)
  resetTestData()
})
afterAll(async () => {
  await models.sequelize.close()
})

function resetTestData () {
  stream = { id: 'abcdsaqwery1', name: 'test stream', createdById: seedValues.primaryUserId }
  trashesStream = { id: 'trashes00000', name: 'trashes stream', createdById: seedValues.primaryUserId }
  audioFileFormat = { value: 'flac' }
  audioCodec = { value: 'flac' }
  fileExtension = { value: '.flac' }
  testPayload = {
    stream_source_file: {
      filename: '0d99db29f26d-2021-04-19T12-11-00.flac',
      duration: 60000,
      sample_count: 3840000,
      channels_count: 1,
      bit_rate: 1,
      sample_rate: 64000,
      sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74266'
    },
    stream_segments: [
      {
        start: '2021-04-18T12:12:00.000Z',
        end: '2021-04-18T12:13:00.000Z',
        sample_count: 3840000,
        file_size: 200000
      }
    ]
  }
  testRequestData = [{
    stream: stream.id,
    starts: [testPayload.stream_segments[0].start]
  }]
}

async function commonSetup () {
  await models.Stream.create(stream)
  await models.Stream.create(trashesStream)
  audioFileFormatId = (await models.AudioFileFormat.create(audioFileFormat)).id
  audioCodecId = (await models.AudioCodec.create(audioCodec)).id
  fileExtensionId = (await models.FileExtension.create(fileExtension)).id
  const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
  await models.StreamSegment.create({ ...testPayload.stream_segments[0], stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
}

describe('DELETE internal/arbimon/recordings', () => {
  test('happy path', async () => {
    const response = await request(app).delete('/recordings').send(testRequestData)

    expect(response.statusCode).toBe(200)
  })
  test('can set all fields', async () => {
    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    const trashStreamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: trashesStream.id } })
    const trashStreamSegments = await models.StreamSegment.findAll({ where: { stream_id: trashesStream.id } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(0)
    expect(streamSegments.length).toBe(0)
    expect(trashStreamSourceFiles.length).toBe(1)
    expect(trashStreamSegments.length).toBe(1)
  })
  test('can delete 1 recording', async () => {
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T12-11-11.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74211', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    const trashStreamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: trashesStream.id } })
    const trashStreamSegments = await models.StreamSegment.findAll({ where: { stream_id: trashesStream.id } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSegments.length).toBe(1)
    expect(trashStreamSourceFiles.length).toBe(1)
    expect(trashStreamSegments.length).toBe(1)
  })
  test('can delete 2 recordings', async () => {
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T12-11-11.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74211', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
    const sourceFile2 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T14:12:00.000Z', end: '2021-04-18T14:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile2.id })
    testRequestData[0].starts.push('2021-04-18T14:12:00.000Z')

    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    const trashStreamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: trashesStream.id } })
    const trashStreamSegments = await models.StreamSegment.findAll({ where: { stream_id: trashesStream.id } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSegments.length).toBe(1)
    expect(trashStreamSourceFiles.length).toBe(2)
    expect(trashStreamSegments.length).toBe(2)
  })
  test('can delete 3 recordings', async () => {
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T12-11-11.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74211', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
    const sourceFile2 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T14:12:00.000Z', end: '2021-04-18T14:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile2.id })
    const sourceFile3 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T14-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74213', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T15:12:00.000Z', end: '2021-04-18T15:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile3.id })
    testRequestData[0].starts.push('2021-04-18T14:12:00.000Z', '2021-04-18T15:12:00.000Z')

    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    const trashStreamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: trashesStream.id } })
    const trashStreamSegments = await models.StreamSegment.findAll({ where: { stream_id: trashesStream.id } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSegments.length).toBe(1)
    expect(trashStreamSourceFiles.length).toBe(3)
    expect(trashStreamSegments.length).toBe(3)
  })
  test('can delete 1 recordings then reupload then delete', async () => {
    // First delete
    testRequestData[0].starts.push('2021-04-18T14:12:00.000Z')
    const sourceFile2 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T14:12:00.000Z', end: '2021-04-18T14:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile2.id })
    await request(app).delete('/recordings').send(testRequestData)

    // Second delete
    const sourceFiles3 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T14:12:00.000Z', end: '2021-04-18T14:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFiles3.id })
    const response2 = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    const trashStreamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: trashesStream.id } })
    const trashStreamSegments = await models.StreamSegment.findAll({ where: { stream_id: trashesStream.id } })

    expect(response2.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(0)
    expect(streamSegments.length).toBe(0)
    expect(trashStreamSourceFiles.length).toBe(3)
    expect(trashStreamSegments.length).toBe(3)
  })
  test('can delete recordings from different streams', async () => {
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T12-11-11.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74211', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
    const testStream2 = { id: '1delete6y5yb', name: 'test stream 2', createdById: seedValues.primaryUserId }
    await models.Stream.create(testStream2)
    const sourceFile2 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: testStream2.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T14:12:00.000Z', end: '2021-04-18T14:13:00.000Z', stream_id: testStream2.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile2.id })
    const sourceFile3 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T14-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74213', stream_id: testStream2.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T15:12:00.000Z', end: '2021-04-18T15:13:00.000Z', stream_id: testStream2.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile3.id })
    testRequestData.push({
      stream: testStream2.id,
      starts: ['2021-04-18T14:12:00.000Z']
    })

    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: [stream.id, testStream2.id] } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: [stream.id, testStream2.id] } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(2)
    expect(streamSegments.length).toBe(2)
  })
  test('can delete recordings from any one stream, but the streams has the same starts', async () => {
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T12-11-11.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74211', stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })
    const testStream2 = { id: '1delete6y5yb', name: 'test stream 2', createdById: seedValues.primaryUserId }
    await models.Stream.create(testStream2)
    const sourceFile2 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T13-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74212', stream_id: testStream2.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T12:12:00.000Z', end: '2021-04-18T12:13:00.000Z', stream_id: testStream2.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile2.id })
    const sourceFile3 = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, filename: '0d99db29f26d-2021-04-19T14-11-12.flac', sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74213', stream_id: testStream2.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], start: '2021-04-18T13:12:00.000Z', end: '2021-04-18T13:13:00.000Z', stream_id: testStream2.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile3.id })
    testRequestData[0].starts.push('2021-04-18T13:12:00.000Z')
    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: [stream.id, testStream2.id] } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: [stream.id, testStream2.id] } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(2)
    expect(streamSegments.length).toBe(2)
    streamSourceFiles.forEach(ssf => expect(ssf.stream_id).toBe(testStream2.id))
    streamSegments.forEach(ss => expect(ss.stream_id).toBe(testStream2.id))
  })
  test('doesnt work for not correct dates', async () => {
    testRequestData[0].starts = '20210418_121200'
    const response = await request(app).delete('/recordings').send(testRequestData)

    expect(response.statusCode).toBe(500)
  })
  test('doesnt work for not existing dates', async () => {
    testRequestData[0].starts = '2021-02-18T13:12:00.000Z'
    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })

    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSegments.length).toBe(1)
  })
  test('doesnt work for not correct fields', async () => {
    const response = await request(app).delete('/recordings').send({
      streams: stream.id,
      start: [testPayload.stream_segments[0].start]
    })

    expect(response.statusCode).toBe(500)
  })
})
