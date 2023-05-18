const request = require('supertest')
const moment = require('moment')
const routes = require('./stream')
const models = require('../../_models')
const { truncate, truncateNonBase, expressApp, seedValues, muteConsole } = require('../../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

let stream, audioFileFormat, audioCodec, fileExtension, testPayload, audioFileFormatId, audioCodecId, fileExtensionId
resetTestData()

beforeAll(async () => {
  muteConsole('warn')
  await commonSetup()
})
afterEach(async () => {
  await truncate({ StreamSegment: models.StreamSegment, StreamSourceFile: models.StreamSourceFile })
  await models.Stream.update({ start: null, end: null, sampleRate: null }, { where: { id: stream.id } })
  resetTestData()
})
afterAll(async () => {
  await truncateNonBase(models)
  await models.sequelize.close()
})

function resetTestData () {
  stream = { id: 'abcdsaqwery1', name: 'my stream', createdById: seedValues.primaryUserId }
  audioFileFormat = { value: 'flac' }
  audioCodec = { value: 'flac' }
  fileExtension = { value: '.flac' }
  testPayload = {
    stream_source_file: {
      filename: '0d99db29f26d-2021-04-19T12-11-00.flac',
      audio_file_format: 'flac',
      duration: 60000,
      sample_count: 3840000,
      channels_count: 1,
      bit_rate: 1,
      sample_rate: 64000,
      audio_codec: 'flac',
      sha1_checksum: 'e427f7bf6c589b4856d5f51691d159366d74266',
      meta: {
        Artist: 'Topher White',
        Album: 'Rainforest Connection'
      }
    },
    stream_segments: [
      {
        id: '1dfa13bd-2855-43ae-a5e5-a345d78196fd',
        start: '2021-04-18T12:12:00.000Z',
        end: '2021-04-18T12:13:00.000Z',
        sample_count: 3840000,
        file_extension: '.flac',
        file_size: 200000
      }
    ]
  }
}

async function commonSetup () {
  await models.Stream.findOrCreate({ where: stream })
  audioFileFormatId = (await models.AudioFileFormat.findOrCreate({ where: audioFileFormat }))[0].id
  audioCodecId = (await models.AudioCodec.findOrCreate({ where: audioCodec }))[0].id
  fileExtensionId = (await models.FileExtension.findOrCreate({ where: fileExtension }))[0].id
}

describe('POST internal/ingest/streams/:id/stream-source-files-and-segments', () => {
  test('one stream_source_file and one stream_segments is created', async () => {
    const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(testPayload)

    expect(response.statusCode).toBe(201)
    const streamSourceFiles = await models.StreamSourceFile.findAll()
    const streamSegments = await models.StreamSegment.findAll()
    expect(response.headers.location).toBe(`/stream-source-files/${streamSourceFiles[0].id}`)
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSourceFiles[0].filename).toBe(testPayload.stream_source_file.filename)
    expect(streamSourceFiles[0].audio_file_format_id).toBe(audioFileFormatId)
    expect(streamSourceFiles[0].duration).toBe(testPayload.stream_source_file.duration)
    expect(streamSourceFiles[0].sample_count).toBe(testPayload.stream_source_file.sample_count)
    expect(streamSourceFiles[0].channels_count).toBe(testPayload.stream_source_file.channels_count)
    expect(streamSourceFiles[0].bit_rate).toBe(testPayload.stream_source_file.bit_rate)
    expect(streamSourceFiles[0].sample_rate).toBe(testPayload.stream_source_file.sample_rate)
    expect(streamSourceFiles[0].audio_codec_id).toBe(audioCodecId)
    expect(streamSourceFiles[0].sha1_checksum).toBe(testPayload.stream_source_file.sha1_checksum)
    expect(streamSourceFiles[0].meta).toBe(JSON.stringify(testPayload.stream_source_file.meta))
    expect(streamSegments.length).toBe(1)
    expect(streamSegments[0].id).toBe(testPayload.stream_segments[0].id)
    expect(streamSegments[0].start).toEqual(moment.utc(testPayload.stream_segments[0].start).toDate())
    expect(streamSegments[0].end).toEqual(moment.utc(testPayload.stream_segments[0].end).toDate())
    expect(streamSegments[0].sample_count).toBe(testPayload.stream_segments[0].sample_count)
    expect(streamSegments[0].file_extension_id).toBe(fileExtensionId)
    expect(streamSegments[0].stream_source_file_id).toBe(streamSourceFiles[0].id)
  })

  test('one stream_source_file and two stream_segments are created', async () => {
    const requestBody = Object.assign({}, testPayload)
    requestBody.stream_segments.push(
      { id: '877408a7-6579-4de0-8c29-bddda0968f87', start: '2021-04-18T12:13:00.000Z', end: '2021-04-18T12:14:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 }
    )

    const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)
    expect(response.statusCode).toBe(201)
    const streamSourceFiles = await models.StreamSourceFile.findAll()
    const streamSegments = await models.StreamSegment.findAll()
    expect(streamSourceFiles.length).toBe(1)
    expect(streamSegments.length).toBe(2)
    expect(streamSegments[1].id).toBe(requestBody.stream_segments[1].id)
    expect(streamSegments[1].start).toEqual(moment.utc(requestBody.stream_segments[1].start).toDate())
    expect(streamSegments[1].end).toEqual(moment.utc(requestBody.stream_segments[1].end).toDate())
    expect(streamSegments[1].sample_count).toBe(requestBody.stream_segments[1].sample_count)
    expect(streamSegments[1].file_extension_id).toBe(fileExtensionId)
    expect(streamSegments[1].stream_source_file_id).toBe(streamSourceFiles[0].id)
  })

  test('one stream_source_file and ten stream_segments are created', async () => {
    const requestBody = Object.assign({}, testPayload)
    requestBody.stream_segments.push(
      { id: '877408a7-6579-4de0-8c29-bddda0968f01', start: '2021-04-18T12:13:00.000Z', end: '2021-04-18T12:14:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f02', start: '2021-04-18T12:14:00.000Z', end: '2021-04-18T12:15:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f03', start: '2021-04-18T12:15:00.000Z', end: '2021-04-18T12:16:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f04', start: '2021-04-18T12:16:00.000Z', end: '2021-04-18T12:17:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f05', start: '2021-04-18T12:17:00.000Z', end: '2021-04-18T12:18:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f06', start: '2021-04-18T12:18:00.000Z', end: '2021-04-18T12:19:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f07', start: '2021-04-18T12:19:00.000Z', end: '2021-04-18T12:20:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f08', start: '2021-04-18T12:20:00.000Z', end: '2021-04-18T12:21:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 },
      { id: '877408a7-6579-4de0-8c29-bddda0968f09', start: '2021-04-18T12:21:00.000Z', end: '2021-04-18T12:22:00.000Z', sample_count: 3840000, file_extension: '.flac', file_size: 200000 }
    )

    const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const streamSourceFiles = await models.StreamSourceFile.findAll()
    const streamSegments = await models.StreamSegment.findAll()
    expect(streamSourceFiles.length).toBe(1)
    expect(requestBody.stream_segments.map(s => s.id).every(s => streamSegments.map(ss => ss.id).includes(s))).toBeTruthy()
    const firstSegment = streamSegments.find(s => s.id === requestBody.stream_segments[1].id)
    expect(firstSegment.id).toBe(requestBody.stream_segments[1].id)
    expect(firstSegment.start).toEqual(moment.utc(requestBody.stream_segments[1].start).toDate())
    expect(firstSegment.end).toEqual(moment.utc(requestBody.stream_segments[1].end).toDate())
    expect(firstSegment.sample_count).toBe(requestBody.stream_segments[1].sample_count)
    expect(firstSegment.file_extension_id).toBe(fileExtensionId)
    expect(firstSegment.stream_source_file_id).toBe(streamSourceFiles[0].id)
    const lastSegment = streamSegments.find(s => s.id === requestBody.stream_segments[9].id)
    expect(lastSegment.id).toBe(requestBody.stream_segments[9].id)
    expect(lastSegment.start).toEqual(moment.utc(requestBody.stream_segments[9].start).toDate())
    expect(lastSegment.end).toEqual(moment.utc(requestBody.stream_segments[9].end).toDate())
    expect(lastSegment.sample_count).toBe(requestBody.stream_segments[9].sample_count)
    expect(lastSegment.file_extension_id).toBe(fileExtensionId)
    expect(lastSegment.stream_source_file_id).toBe(streamSourceFiles[0].id)
  })

  test('new audio_file_format, audio_codec and file_extension rows are created', async () => {
    const requestBody = Object.assign({}, testPayload)
    requestBody.stream_source_file.filename = '0d99db29f26d-2021-04-19T12-11-00.wav'
    requestBody.stream_source_file.audio_codec = 'wav'
    requestBody.stream_source_file.audio_file_format = 'wav'
    requestBody.stream_segments[0].file_extension = '.wav'

    const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

    expect(response.statusCode).toBe(201)
    const streamSourceFile = await models.StreamSourceFile.findOne({ where: { filename: requestBody.stream_source_file.filename } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_source_file_id: streamSourceFile.id } })
    const audioFormat = await models.AudioFileFormat.findOne({ where: { id: streamSourceFile.audio_file_format_id } })
    const codec = await models.AudioCodec.findOne({ where: { id: streamSourceFile.audio_codec_id } })
    const extension = await models.FileExtension.findOne({ where: { id: streamSegments[0].file_extension_id } })
    expect(audioFormat.value).toBe(requestBody.stream_source_file.audio_file_format)
    expect(codec.value).toBe(requestBody.stream_source_file.audio_codec)
    expect(streamSourceFile.sha1_checksum).toBe(requestBody.stream_source_file.sha1_checksum)
    expect(extension.value).toBe('.wav')
  })

  describe('request body validation', () => {
    test('validation error is returned if stream_source_file is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file

      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'stream_source_file\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_segments is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_segments
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'stream_segments\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.filename is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.filename
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'filename\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.audio_file_format is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.audio_file_format
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'audio_file_format\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.duration is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.duration
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'duration\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.duration is less than 1', async () => {
      // const { stream, testPayload } = await commonSetup()
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.duration = 0
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'duration\' is smaller than the minimum 1.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.sample_count is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.sample_count
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'sample_count\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.sample_count is less than 1', async () => {
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.sample_count = 0
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'sample_count\' is smaller than the minimum 1.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('sample_rate is set to 1 for stream_source_file if stream_source_file.sample_rate is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.sample_rate
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(201)
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(1)
      expect(streamSourceFiles[0].sample_rate).toBe(1)
      expect(streamSegments.length).toBe(1)
    })

    test('validation error is returned if stream_source_file.sample_rate is less than 1', async () => {
      // const { stream, testPayload } = await commonSetup()
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.sample_rate = 0
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'sample_rate\' is smaller than the minimum 1.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('channels_count is set to 1 for stream_source_file if stream_source_file.channels_count is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.channels_count
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(201)
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(1)
      expect(streamSourceFiles[0].channels_count).toBe(1)
      expect(streamSegments.length).toBe(1)
    })

    test('validation error is returned if stream_source_file.channels_count is less than 1', async () => {
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.channels_count = 0
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'channels_count\' is smaller than the minimum 1.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('bit_rate is set to 1 for stream_source_file if stream_source_file.bit_rate is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.bit_rate
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(201)
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(1)
      expect(streamSourceFiles[0].bit_rate).toBe(1)
      expect(streamSegments.length).toBe(1)
    })

    test('validation error is returned if stream_source_file.bit_rate is less than 1', async () => {
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.bit_rate = 0
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'bit_rate\' is smaller than the minimum 1.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.audio_codec is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.audio_codec
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'audio_codec\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_source_file.sha1_checksum is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_source_file.sha1_checksum
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'sha1_checksum\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_segment.start is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_segments[0].start
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'start\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_segment.end is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_segments[0].end
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'end\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_segment.sample_count is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_segments[0].sample_count
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'sample_count\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('validation error is returned if stream_segment.file_extension is not set', async () => {
      const requestBody = Object.assign({}, testPayload)
      delete requestBody.stream_segments[0].file_extension
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(requestBody)

      expect(response.statusCode).toBe(400)
      expect(response.body.message).toBe('Validation errors: Parameter \'file_extension\' the parameter is required but was not provided.')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })

    test('empty meta is saved for stream_source_file if provided meta is not an object', async () => {
      const requestBody = Object.assign({}, testPayload)
      requestBody.stream_source_file.meta = 123
      const response = await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(testPayload)

      expect(response.statusCode).toBe(201)
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(1)
      expect(streamSourceFiles[0].meta).toBeNull()
      expect(streamSegments.length).toBe(1)
    })

    test('empty result error is returned if stream does not exist', async () => {
      const response = await request(app).post('/streams/random/stream-source-files-and-segments').send(testPayload)

      expect(response.statusCode).toBe(404)
      expect(response.body.message).toBe('Stream not found')
      const streamSourceFiles = await models.StreamSourceFile.findAll()
      const streamSegments = await models.StreamSegment.findAll()
      expect(streamSourceFiles.length).toBe(0)
      expect(streamSegments.length).toBe(0)
    })
  })

  describe('stream bounds update', () => {
    test('stream start, end and max_sample_rate are set for empty stream', async () => {
      await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(testPayload)

      const streamFromDb = await models.Stream.findOne({ where: { id: stream.id } })
      expect(streamFromDb.maxSampleRate).toBe(testPayload.stream_source_file.sample_rate)
      expect(streamFromDb.start).toEqual(moment.utc(testPayload.stream_segments[0].start).toDate())
      expect(streamFromDb.end).toEqual(moment.utc(testPayload.stream_segments[0].end).toDate())
    })

    test('stream start, end and max_sample_rate are updated if new values are bigger/smaller', async () => {
      const stream = await models.Stream.create(
        { id: 'abcdsaqwery2', name: 'my stream 2', createdById: seedValues.primaryUserId, start: '2021-04-18T12:12:10.000Z', end: '2021-04-18T12:12:20.000Z', maxSampleRate: 24000 }
      )

      await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(testPayload)

      const streamFromDb = await models.Stream.findOne({ where: { id: stream.id } })
      expect(streamFromDb.maxSampleRate).toBe(testPayload.stream_source_file.sample_rate)
      expect(streamFromDb.start).toEqual(moment.utc(testPayload.stream_segments[0].start).toDate())
      expect(streamFromDb.end).toEqual(moment.utc(testPayload.stream_segments[0].end).toDate())
    })

    test('stream start, end and max_sample_rate are not updated if new values are not bigger/smaller', async () => {
      const stream = await models.Stream.create(
        { id: 'abcdsaqwery3', name: 'my stream 3', createdById: seedValues.primaryUserId, start: '2020-01-01 00:00:00', end: '2021-05-05 00:00:00', maxSampleRate: 128000 }
      )

      await request(app).post(`/streams/${stream.id}/stream-source-files-and-segments`).send(testPayload)

      const streamFromDb = await models.Stream.findOne({ where: { id: stream.id } })
      expect(streamFromDb.maxSampleRate).toBe(stream.maxSampleRate)
      expect(streamFromDb.start).toEqual(moment.utc(stream.start).toDate())
      expect(streamFromDb.end).toEqual(moment.utc(stream.end).toDate())
    })
  })
})
