const models = require('../../modelsTimescale')
const { migrate, truncate, seed, seedValues } = require('../../utils/sequelize/testing')
jest.mock('../../utils/message-queue/sqs')
const defaultMessageQueue = require('../../utils/message-queue/sqs')

const service = require('./segments')
// const { SEGMENT_CREATED } = require('../../tasks/event-names')
let streamSegmSpy

describe('Message queue', () => {
  beforeEach(() => {
    streamSegmSpy = jest.spyOn(models.StreamSegment, 'create').mockImplementation(() => Promise.resolve())
  })

  test('Create segment not queued when default queue not enabled', async () => {
    defaultMessageQueue.isEnabled.mockReturnValue(false)
    defaultMessageQueue.publish = jest.fn()
    const segment = { id: 'a5e5', start: '2021-04-18T12:15:00.000Z', stream_id: '13d781bd' }
    console.error = jest.fn()

    await service.create(segment)

    expect(defaultMessageQueue.publish).not.toHaveBeenCalled()
    expect(models.StreamSegment.create).toHaveBeenCalled()
  })

  // test('Create segment triggers queue message', async () => {
  //   defaultMessageQueue.isEnabled.mockReturnValue(true)
  //   defaultMessageQueue.publish = jest.fn(() => Promise.resolve())
  //   const id = '1dfa13bd-2855-43ae-a5e5-a345d78196fd'
  //   const start = '2021-04-18T12:12:00.000Z'
  //   const streamId = '13d781bd43ae'
  //   const segment = { id, start, end: '2021-04-18T12:15:00.000Z', stream_id: streamId }

  //   await service.create(segment)

  //   expect(defaultMessageQueue.publish).toHaveBeenCalledTimes(1)
  //   expect(defaultMessageQueue.publish).toHaveBeenCalledWith(SEGMENT_CREATED, { id, start, stream_id: streamId })
  //   expect(StreamSegment.create).toHaveBeenCalled()
  // })

  // test('Create segment queue fails gracefully', async () => {
  //   defaultMessageQueue.isEnabled.mockReturnValue(true)
  //   defaultMessageQueue.publish.mockReturnValue(Promise.reject(new Error('Unable to connect')))
  //   const segment = { id: 'a5e5', start: '2021-04-18T12:15:00.000Z', stream_id: '13d781bd' }
  //   console.error = jest.fn()

  //   await service.create(segment)

  //   expect(console.error).toHaveBeenCalled()
  //   expect(StreamSegment.create).toHaveBeenCalled()
  // })
})

describe('query function', () => {
  let stream, sourceFile
  const segments = []
  beforeAll(async () => {
    streamSegmSpy.mockRestore()
    await migrate(models.sequelize, models.Sequelize)
    await seed(models)
    await models.AudioFileFormat.create({ id: 1, value: 'wav' })
    await models.AudioCodec.create({ id: 1, value: 'wav' })
    await models.FileExtension.create({ id: 1, value: '.wav' })
    stream = await models.Stream.create({ id: 'aaaaaaaaaaaa', name: 'Jaguar Station', latitude: 10.1, longitude: 101.1, createdById: seedValues.primaryUserId })
    sourceFile = await models.StreamSourceFile.create({ stream_id: stream.id, filename: '20210726_101000.wav', duration: 600, sample_count: 1, sample_rate: 12000, channels_count: 1, bit_rate: 1, audio_codec_id: 1, audio_file_format_id: 1 })
    for (const seg of
      [
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
      ]) {
      segments.push(await models.StreamSegment.create(seg))
    }
  })

  afterAll(async () => {
    await truncate([models.StreamSegment, models.StreamSourceFile, models.Stream])
  })

  test('returns 1 segment', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:00:00.000Z',
      end: '2021-07-26T10:10:20.000Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[0].id)
  })

  test('returns 2, 3 and 4 segments', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:11:30.000Z',
      end: '2021-07-26T10:13:20.000Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(3)
    expect(data.results[0].id).toBe(segments[1].id)
    expect(data.results[1].id).toBe(segments[2].id)
    expect(data.results[2].id).toBe(segments[3].id)
  })

  test('returns 10 segment', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:19:22.000Z',
      end: '2021-07-26T10:32:20.000Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[9].id)
  })

  test('returns 9 segment with exact start time', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:18:00.000Z',
      end: '2021-07-26T10:18:10.000Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[8].id)
  })

  test('returns 9 segment with exact start and end time', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:18:00.000Z',
      end: '2021-07-26T10:18:59.999Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[8].id)
  })

  test('returns 9 segment with time in the middle of segment', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:18:10.000Z',
      end: '2021-07-26T10:18:20.999Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[8].id)
  })

  test('returns 9 segment when strict is true', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:17:45.000Z',
      end: '2021-07-26T10:18:20.999Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: true,
      readableBy: undefined
    })
    expect(data.results.length).toBe(1)
    expect(data.results[0].id).toBe(segments[8].id)
  })

  test('does not return 9 segment with time in the middle of segment when strict is true', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:18:10.000Z',
      end: '2021-07-26T10:18:20.999Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: true,
      readableBy: undefined
    })
    expect(data.results.length).toBe(0)
  })

  test('returns all segments', async () => {
    const data = await service.query({
      streamId: stream.id,
      start: '2021-07-26T10:00:00.000Z',
      end: '2021-07-26T10:32:20.000Z'
    }, {
      fields: ['id', 'start', 'end', 'sample_count', 'stream_id', 'stream_source_file_id', 'stream_source_file', 'file_extension_id', 'file_extension'],
      strict: false,
      readableBy: undefined
    })
    expect(data.results.length).toBe(10)
  })
})
