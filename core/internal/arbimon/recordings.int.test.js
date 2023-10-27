const request = require('supertest')
const routes = require('../routes')
const models = require('../../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../../common/testing/sequelize')
const app = expressApp()

app.use('/', routes.arbimon)

process.env.TRASHES_STREAM_ID = '1delete6y3yb'

let stream, trashesStream, audioFileFormat, audioCodec, fileExtension, testPayload, testRequestData, audioFileFormatId, audioCodecId, fileExtensionId
resetTestData()

beforeAll(async () => {
  muteConsole('warn')
})
afterEach(async () => {
  await truncateNonBase(models)
  resetTestData()
})
afterAll(async () => {
  await models.sequelize.close()
})

function resetTestData () {
  stream = { id: 'abcdsaqwery1', name: 'my stream', createdById: seedValues.primaryUserId }
  trashesStream = { id: '1delete6y3yb', name: 'trashes stream', createdById: seedValues.primaryUserId }
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
    stream: 'abcdsaqwery1',
    starts: ['2021-04-18T12:12:00.000Z']

  }]
}

async function commonSetup () {
  await models.Stream.findOrCreate({ where: stream })
  await models.Stream.findOrCreate({ where: trashesStream })
  audioFileFormatId = (await models.AudioFileFormat.findOrCreate({ where: audioFileFormat }))[0].id
  audioCodecId = (await models.AudioCodec.findOrCreate({ where: audioCodec }))[0].id
  fileExtensionId = (await models.FileExtension.findOrCreate({ where: fileExtension }))[0].id
}

describe('DELETE internal/arbimon/recordings', () => {
  test('stream_source_file and stream_segments is deleted', async () => {
    await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ ...testPayload.stream_source_file, stream_id: stream.id, audio_codec_id: audioCodecId, audio_file_format_id: audioFileFormatId })
    await models.StreamSegment.create({ ...testPayload.stream_segments[0], stream_id: stream.id, file_extension_id: fileExtensionId, stream_source_file_id: sourceFile.id })

    const response = await request(app).delete('/recordings').send(testRequestData)

    const streamSourceFiles = await models.StreamSourceFile.findAll({ where: { stream_id: stream.id } })
    const streamSegments = await models.StreamSegment.findAll({ where: { stream_id: stream.id } })
    expect(response.statusCode).toBe(200)
    expect(streamSourceFiles.length).toBe(0)
    expect(streamSegments.length).toBe(0)
  })
})
