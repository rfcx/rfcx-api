const { ValidationError } = require('../../error-handling/errors')
jest.mock('../../../core/streams/dao')
const { getStreamRangeToken } = require('../../../core/streams/dao')

const streamTokenStrategyServicePath = './service'
jest.mock(streamTokenStrategyServicePath)
const { parseStreamAndTime } = require(streamTokenStrategyServicePath)

const strategy = require('./index')
const req = { originalUrl: '/internal/assets/streams/e893qsy09mwn_t20210527T205717979Z.20210527T205737979Z_z95_wdolph_g1_fspec_d600.410.png', rfcx: {} }

describe('stream-token strategy', () => {
  beforeEach(() => {
    getStreamRangeToken.mockImplementation(() => { return 'user_token' })
  })
  afterEach(() => {
    getStreamRangeToken.mockRestore()
    parseStreamAndTime.mockRestore()
  })
  test('Should call callback function with ValidationError when stream is undefined', async () => {
    parseStreamAndTime.mockImplementation(() => { return Promise.resolve({ start: 1, end: 2 }) })
    const mockCallback = jest.fn(() => {})
    await strategy._verify(req, 'user_token', mockCallback)
    expect(mockCallback.mock.calls.length).toBe(1)
    expect((mockCallback.mock.calls[0][0])).toBeInstanceOf(ValidationError)
    expect((mockCallback.mock.calls[0][0].message)).toBe('`stream`, `start` and `end` must be specified')
    expect(mockCallback.mock.calls[0][1]).toBeUndefined()
  })
  test('Should call callback function with ValidationError when start is undefined', async () => {
    parseStreamAndTime.mockImplementation(() => { return Promise.resolve({ stream: '123456789010', end: 2 }) })
    const mockCallback = jest.fn(() => {})
    await strategy._verify(req, 'user_token', mockCallback)
    expect(mockCallback.mock.calls.length).toBe(1)
    expect((mockCallback.mock.calls[0][0])).toBeInstanceOf(ValidationError)
    expect((mockCallback.mock.calls[0][0].message)).toBe('`stream`, `start` and `end` must be specified')
    expect(mockCallback.mock.calls[0][1]).toBeUndefined()
  })
  test('Should call callback function with ValidationError when end is undefined', async () => {
    parseStreamAndTime.mockImplementation(() => { return Promise.resolve({ stream: '123456789010', start: 1 }) })
    const mockCallback = jest.fn(() => {})
    await strategy._verify(req, 'user_token', mockCallback)
    expect(mockCallback.mock.calls.length).toBe(1)
    expect((mockCallback.mock.calls[0][0])).toBeInstanceOf(ValidationError)
    expect((mockCallback.mock.calls[0][0].message)).toBe('`stream`, `start` and `end` must be specified')
    expect(mockCallback.mock.calls[0][1]).toBeUndefined()
  })
  test('Should call callback function with false when tokens do not match', async () => {
    parseStreamAndTime.mockImplementation(() => { return Promise.resolve({ stream: '123456789010', start: 1, end: 2 }) })
    const mockCallback = jest.fn(() => {})
    await strategy._verify(req, 'user_token2', mockCallback)
    expect(mockCallback.mock.calls.length).toBe(1)
    expect(mockCallback.mock.calls[0][0]).toBeNull()
    expect(mockCallback.mock.calls[0][1]).toBeFalsy()
  })
  test('Should call callback function with super user + system user flags', async () => {
    parseStreamAndTime.mockImplementation(() => { return Promise.resolve({ stream: '123456789010', start: 1, end: 2 }) })
    const mockCallback = jest.fn(() => {})
    await strategy._verify(req, 'user_token', mockCallback)
    expect(mockCallback.mock.calls.length).toBe(1)
    expect(mockCallback.mock.calls[0][0]).toBeNull()
    expect(mockCallback.mock.calls[0][1].stream_token).toBeTruthy()
    expect(mockCallback.mock.calls[0][1].stream_token.stream).toBe('123456789010')
    expect(mockCallback.mock.calls[0][1].stream_token.start).toBe(1)
    expect(mockCallback.mock.calls[0][1].stream_token.end).toBe(2)
  })
})
