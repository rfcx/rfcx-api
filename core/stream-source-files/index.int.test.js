const request = require('supertest')
const routes = require('./index')
const models = require('../_models')
const { truncateNonBase, expressApp, seedValues, muteConsole } = require('../../common/testing/sequelize')

const app = expressApp()

app.use('/', routes)

beforeAll(async () => {
  muteConsole('warn')
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
  const stream = await models.Stream.create({ id: 'j123k', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId, projectId: project.id })
  return { audioFileFormat, audioCodec, fileExtension, project, stream }
}

describe('DELETE stream-source-files/:id', () => {
  test('deletes stream source file and one associated stream segment', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })

    const streamSourceFilesBefore = await models.StreamSourceFile.findAll()
    const streamSegmentsAfter = await models.StreamSegment.findAll()
    expect(streamSourceFilesBefore.length).toBe(1)
    expect(streamSegmentsAfter.length).toBe(1)

    const response = await request(app).delete(`/${sourceFile.id}`).send()

    expect(response.statusCode).toBe(204)
    const streamSourceFiles = await models.StreamSourceFile.findAll()
    const streamSegments = await models.StreamSegment.findAll()
    expect(streamSourceFiles.length).toBe(0)
    expect(streamSegments.length).toBe(0)
  })
  test('deletes stream source file and three associated stream segments', async () => {
    const { audioFileFormat, audioCodec, fileExtension, stream } = await commonSetup()
    const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101010.wav', duration: 60, sample_count: 720000, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: audioCodec.id, audio_file_format_id: audioFileFormat.id })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:10:10Z', end: '2021-07-26T10:11:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:11:10Z', end: '2021-07-26T10:12:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 1 })
    await models.StreamSegment.create({ stream_id: stream.id, start: '2021-07-26T10:12:10Z', end: '2021-07-26T10:13:10Z', stream_source_file_id: sourceFile.id, sample_count: 720000, file_extension_id: fileExtension.id, availability: 0 })

    const streamSourceFilesBefore = await models.StreamSourceFile.findAll()
    const streamSegmentsAfter = await models.StreamSegment.findAll()
    expect(streamSourceFilesBefore.length).toBe(1)
    expect(streamSegmentsAfter.length).toBe(3)

    const response = await request(app).delete(`/${sourceFile.id}`).send()

    expect(response.statusCode).toBe(204)
    const streamSourceFiles = await models.StreamSourceFile.findAll()
    const streamSegments = await models.StreamSegment.findAll()
    expect(streamSourceFiles.length).toBe(0)
    expect(streamSegments.length).toBe(0)
  })
})
