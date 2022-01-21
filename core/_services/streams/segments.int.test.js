const models = require('../../../models')
const { migrate, truncate, seed, seedValues } = require('../../utils/sequelize/testing')
const service = require('./segments')
const moment = require('moment')

beforeAll(async () => {
  await migrate(models.sequelize, models.Sequelize)
  await seed(models)
})
beforeEach(async () => {
  await truncate(models)
})

async function commonSetup () {
  await models.AudioFileFormat.create({ id: 1, value: 'wav' })
  await models.AudioCodec.create({ id: 1, value: 'wav' })
  await models.FileExtension.create({ id: 1, value: '.wav' })
  const stream = await models.Stream.create({ id: 'aaaaaaaaaaaa', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
  const sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101000.wav', duration: 600, sample_count: 1, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
  const segments = await Promise.all([
    { stream_id: stream.id, start: '2021-07-26T10:10:00.000Z', end: '2021-07-26T10:10:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:11:00.000Z', end: '2021-07-26T10:11:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:12:00.000Z', end: '2021-07-26T10:12:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:13:00.000Z', end: '2021-07-26T10:13:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:14:00.000Z', end: '2021-07-26T10:14:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:15:00.000Z', end: '2021-07-26T10:15:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:16:00.000Z', end: '2021-07-26T10:16:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:17:00.000Z', end: '2021-07-26T10:17:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:18:00.000Z', end: '2021-07-26T10:18:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 },
    { stream_id: stream.id, start: '2021-07-26T10:19:00.000Z', end: '2021-07-26T10:19:59.999Z', stream_source_file_id: sourceFile.id, sample_count: 1, file_extension_id: 1 }
  ].map(segment => models.StreamSegment.create(segment)))
  return { stream, segments }
}

test('returns 1 segment', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:00:00.000Z'),
    end: moment('2021-07-26T10:10:20.000Z')
  }, { strict: false })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[0].id)
})

test('returns 2, 3 and 4 segments', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:11:30.000Z'),
    end: moment('2021-07-26T10:13:20.000Z')
  }, { strict: false })
  expect(data.results.length).toBe(3)
  expect(data.results[0].id).toBe(segments[1].id)
  expect(data.results[1].id).toBe(segments[2].id)
  expect(data.results[2].id).toBe(segments[3].id)
})

test('returns 10 segment', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:19:22.000Z'),
    end: moment('2021-07-26T10:32:20.000Z')
  }, { strict: false })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[9].id)
})

test('returns 9 segment with exact start time', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:18:00.000Z'),
    end: moment('2021-07-26T10:18:10.000Z')
  }, { strict: false })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[8].id)
})

test('returns 9 segment with exact start and end time', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:18:00.000Z'),
    end: moment('2021-07-26T10:18:59.999Z')
  }, { strict: false })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[8].id)
})

test('returns 9 segment with time in the middle of segment', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:18:10.000Z'),
    end: moment('2021-07-26T10:18:20.999Z')
  }, { strict: false })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[8].id)
})

test('returns 9 segment when strict is true', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:17:45.000Z'),
    end: moment('2021-07-26T10:18:20.999Z')
  }, { strict: true })
  expect(data.results.length).toBe(1)
  expect(data.results[0].id).toBe(segments[8].id)
})

test('does not return 9 segment with time in the middle of segment when strict is true', async () => {
  const { stream } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:18:10.000Z'),
    end: moment('2021-07-26T10:18:20.999Z')
  }, { strict: true })
  expect(data.results.length).toBe(0)
})

test('returns all segments', async () => {
  const { stream, segments } = await commonSetup()
  const data = await service.query({
    streamId: stream.id,
    start: moment('2021-07-26T10:00:00.000Z'),
    end: moment('2021-07-26T10:32:20.000Z')
  }, { strict: false })
  expect(data.results.length).toBe(segments.length)
})
