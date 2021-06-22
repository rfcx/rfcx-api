jest.mock('../../modelsTimescale')
const { StreamSegment } = require('../../modelsTimescale')
jest.mock('../../utils/message-queue/default')
const defaultMessageQueue = require('../../utils/message-queue/default')

const service = require('./segments')
const { SEGMENT_CREATED } = require('../../utils/message-queue/events')

describe('Message queue', () => {
  beforeEach(() => {
    StreamSegment.create.mockReturnValue(Promise.resolve())
  })

  test('Create segment not queued when default queue not enabled', async () => {
    defaultMessageQueue.isEnabled.mockReturnValue(false)
    defaultMessageQueue.enqueue = jest.fn()
    const segment = { id: 'a5e5', start: '2021-04-18T12:15:00.000Z', stream_id: '13d781bd' }
    console.error = jest.fn()

    await service.create(segment)

    expect(defaultMessageQueue.enqueue).not.toHaveBeenCalled()
    expect(StreamSegment.create).toHaveBeenCalled()
  })

  test('Create segment triggers queue message', async () => {
    defaultMessageQueue.isEnabled.mockReturnValue(true)
    defaultMessageQueue.enqueue = jest.fn(() => Promise.resolve())
    const id = '1dfa13bd-2855-43ae-a5e5-a345d78196fd'
    const start = '2021-04-18T12:12:00.000Z'
    const streamId = '13d781bd43ae'
    const segment = { id, start, end: '2021-04-18T12:15:00.000Z', stream_id: streamId }

    await service.create(segment)

    expect(defaultMessageQueue.enqueue).toHaveBeenCalledTimes(1)
    expect(defaultMessageQueue.enqueue).toHaveBeenCalledWith(SEGMENT_CREATED, { id, start, stream_id: streamId })
    expect(StreamSegment.create).toHaveBeenCalled()
  })

  test('Create segment queue fails gracefully', async () => {
    defaultMessageQueue.isEnabled.mockReturnValue(true)
    defaultMessageQueue.enqueue.mockReturnValue(Promise.reject(new Error('Unable to connect')))
    const segment = { id: 'a5e5', start: '2021-04-18T12:15:00.000Z', stream_id: '13d781bd' }
    console.error = jest.fn()

    await service.create(segment)

    expect(console.error).toHaveBeenCalled()
    expect(StreamSegment.create).toHaveBeenCalled()
  })
})
