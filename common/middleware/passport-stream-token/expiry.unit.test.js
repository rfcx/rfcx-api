/**
 * Expiry behaviour for the stream-token strategy.
 *
 * These tests deliberately use the REAL `getStreamRangeToken` (no mock) so that
 * the signature and the expiry check are exercised together. The sibling
 * index.unit.test.js mocks the dao, which is why it cannot catch a signing
 * regression.
 */
const streamTokenStrategyServicePath = './service'
jest.mock(streamTokenStrategyServicePath)
const { parseStreamAndTime } = require(streamTokenStrategyServicePath)

const { getStreamRangeToken } = require('../../../core/streams/dao')
const strategy = require('./index')

const STREAM = '123456789010'
const START = 1
const END = 2
const ASSET_URL = '/internal/assets/streams/e893qsy09mwn_t20210527T205717979Z.20210527T205737979Z_z95_wdolph_g1_fspec_d600.410.png'

const nowSec = () => Math.floor(Date.now() / 1000)
const future = () => nowSec() + 3600
const past = () => nowSec() - 3600

function makeReq (query = {}) {
  return { originalUrl: ASSET_URL, rfcx: {}, query }
}

function verify (req, token) {
  return new Promise(resolve => {
    strategy._verify(req, token, (err, user) => resolve({ err, user }))
  })
}

describe('stream-token expiry', () => {
  beforeEach(() => {
    parseStreamAndTime.mockImplementation(() =>
      Promise.resolve({ stream: STREAM, start: START, end: END }))
  })
  afterEach(() => { parseStreamAndTime.mockRestore() })

  // --- backward compatibility -------------------------------------------
  test('a token minted WITHOUT exp still verifies when no exp is supplied', async () => {
    const token = getStreamRangeToken(STREAM, START, END)
    const { err, user } = await verify(makeReq(), token)
    expect(err).toBeNull()
    expect(user).toBeTruthy()
    expect(user.has_stream_token).toBe(true)
    expect(user.stream_token.exp).toBeUndefined()
  })

  // --- the happy path ----------------------------------------------------
  test('a token minted WITH a future exp verifies and carries exp', async () => {
    const exp = future()
    const token = getStreamRangeToken(STREAM, START, END, exp)
    const { err, user } = await verify(makeReq({ exp: String(exp) }), token)
    expect(err).toBeNull()
    expect(user).toBeTruthy()
    expect(user.stream_token.exp).toBe(exp)
  })

  // --- expiry actually expires -------------------------------------------
  test('a token whose exp is in the past is REJECTED', async () => {
    const exp = past()
    const token = getStreamRangeToken(STREAM, START, END, exp)
    const { err, user } = await verify(makeReq({ exp: String(exp) }), token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  // --- exp is signed: it cannot be extended by editing the URL ------------
  test('extending exp in the URL does NOT grant access (exp is signed)', async () => {
    const realExp = past()
    const token = getStreamRangeToken(STREAM, START, END, realExp) // minted, expired
    const forgedExp = future()
    const { err, user } = await verify(makeReq({ exp: String(forgedExp) }), token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  test('a token minted WITH exp does NOT verify when exp is omitted from the URL', async () => {
    const exp = future()
    const token = getStreamRangeToken(STREAM, START, END, exp)
    const { err, user } = await verify(makeReq(), token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  test('a token minted WITHOUT exp does NOT verify when an exp is added to the URL', async () => {
    const token = getStreamRangeToken(STREAM, START, END)
    const { err, user } = await verify(makeReq({ exp: String(future()) }), token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  // --- malformed input ----------------------------------------------------
  // These FAIL CLOSED (401), deliberately NOT a ValidationError: passing an
  // error to done() surfaces as a 500 in this strategy (verified live against
  // the pre-existing missing-stream/start/end path), and a 500 on a bad query
  // param is wrong for the caller and noisy for monitoring. An unparseable
  // expiry is indistinguishable from a bad credential.
  test.each([['abc'], ['12.5'], ['1e9999'], ['NaN'], ['Infinity'], ['-1']])(
    'a non-integer/invalid exp (%s) fails closed as 401, never an auth bypass',
    async (bad) => {
      const token = getStreamRangeToken(STREAM, START, END, bad)
      const { err, user } = await verify(makeReq({ exp: bad }), token)
      expect(err).toBeNull()
      expect(user).toBeFalsy()
    })

  test('an empty exp is treated as absent (backward compatible)', async () => {
    const token = getStreamRangeToken(STREAM, START, END)
    const { err, user } = await verify(makeReq({ exp: '' }), token)
    expect(err).toBeNull()
    expect(user).toBeTruthy()
  })

  // --- the window is still bound -----------------------------------------
  test('a valid, unexpired token for a DIFFERENT window is rejected', async () => {
    const exp = future()
    const token = getStreamRangeToken(STREAM, 999, 1000, exp)
    const { err, user } = await verify(makeReq({ exp: String(exp) }), token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  // --- determinism (CDN cache-key stability) ------------------------------
  test('same inputs produce the same token (URLs stay cacheable)', () => {
    const exp = future()
    expect(getStreamRangeToken(STREAM, START, END, exp))
      .toBe(getStreamRangeToken(STREAM, START, END, exp))
  })

  test('different exp buckets produce different tokens', () => {
    expect(getStreamRangeToken(STREAM, START, END, 1000))
      .not.toBe(getStreamRangeToken(STREAM, START, END, 2000))
  })

  test('null/undefined exp are equivalent to omitting it', () => {
    const base = getStreamRangeToken(STREAM, START, END)
    expect(getStreamRangeToken(STREAM, START, END, undefined)).toBe(base)
    expect(getStreamRangeToken(STREAM, START, END, null)).toBe(base)
  })
})
