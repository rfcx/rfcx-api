jest.mock('../../modelsTimescale')
const { StreamSegment } = require('../../modelsTimescale')
jest.mock('../../utils/message-queue')
const MessageQueue = require('../../utils/message-queue')

const service = require('./segments')
const { SEGMENT_CREATED } = require('../../utils/message-queue/events')

beforeEach(() => {
  StreamSegment.create.mockReturnValue(Promise.resolve())
})

test('Create segment triggers queue message', async () => {
  MessageQueue.isEnabled.mockReturnValue(true)
  const fakeMessageQueue = { enqueue: jest.fn(() => Promise.resolve()) }
  MessageQueue.default.mockReturnValue(fakeMessageQueue)
  const id = '1dfa13bd-2855-43ae-a5e5-a345d78196fd'
  const start = '2021-04-18T12:12:00.000Z'
  const streamId = '13d781bd43ae'
  const segment = { id, start, end: '2021-04-18T12:15:00.000Z', stream_id: streamId }

  await service.create(segment)

  expect(fakeMessageQueue.enqueue).toHaveBeenCalledTimes(1)
  expect(fakeMessageQueue.enqueue).toHaveBeenCalledWith(SEGMENT_CREATED, { id, start, stream_id: streamId })
})

test('Create segment queue fails gracefully', async () => {
  MessageQueue.isEnabled.mockReturnValue(true)
  const fakeMessageQueue = { enqueue: () => { return Promise.reject(new Error('Unable to connect')) } }
  MessageQueue.default.mockReturnValue(fakeMessageQueue)
  const segment = { id: 'a5e5', start: '2021-04-18T12:15:00.000Z', stream_id: '13d781bd' }
  console.error = jest.fn()

  await service.create(segment)

  expect(console.error).toHaveBeenCalled()
})
