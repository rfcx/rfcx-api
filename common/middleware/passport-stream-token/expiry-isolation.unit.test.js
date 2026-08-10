/**
 * ISOLATION GUARANTEE.
 *
 * `authenticate()` wraps EVERY core + core/internal route with
 * ['jwt','stream-token'], so this strategy is consulted on a very large surface.
 * These tests pin the invariants that keep the expiry change from affecting
 * anything other than genuine stream-token callers:
 *
 *  1. An `exp` query param on a request with NO stream-token must not make the
 *     strategy succeed (JWT callers that happen to carry ?exp= are unaffected --
 *     the strategy simply fails and passport falls through to the jwt strategy).
 *  2. The strategy must never THROW on odd input (a throw would surface as a
 *     500 on unrelated routes rather than falling through to jwt).
 */
const streamTokenStrategyServicePath = './service'
jest.mock(streamTokenStrategyServicePath)
const { parseStreamAndTime } = require(streamTokenStrategyServicePath)

const { getStreamRangeToken } = require('../../../core/streams/dao')
const strategy = require('./index')

const ASSET_URL = '/internal/assets/streams/e893qsy09mwn_t20210527T205717979Z.20210527T205737979Z_z95_wdolph_g1_fspec_d600.410.png'
const nowSec = () => Math.floor(Date.now() / 1000)

function verify (req, token) {
  return new Promise(resolve => {
    strategy._verify(req, token, (err, user) => resolve({ err, user }))
  })
}

describe('stream-token expiry — isolation from other callers', () => {
  afterEach(() => { parseStreamAndTime.mockRestore() })

  test('a wrong token + a valid future exp still fails (no bypass)', async () => {
    parseStreamAndTime.mockImplementation(() =>
      Promise.resolve({ stream: '123456789010', start: 1, end: 2 }))
    const { err, user } = await verify(
      { originalUrl: ASSET_URL, rfcx: {}, query: { exp: String(nowSec() + 3600) } },
      'not-the-right-token')
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })

  test('missing stream/start/end still yields ValidationError even with an exp', async () => {
    parseStreamAndTime.mockImplementation(() => Promise.resolve({ start: 1, end: 2 }))
    const { err, user } = await verify(
      { originalUrl: ASSET_URL, rfcx: {}, query: { exp: String(nowSec() + 3600) } },
      'anything')
    expect(err).toBeTruthy()
    expect(err.name).toBe('ValidationError')
    expect(user).toBeUndefined()
  })

  test('a request with NO query object at all does not throw', async () => {
    parseStreamAndTime.mockImplementation(() =>
      Promise.resolve({ stream: '123456789010', start: 1, end: 2 }))
    const token = getStreamRangeToken('123456789010', 1, 2)
    const { err, user } = await verify({ originalUrl: ASSET_URL, rfcx: {} }, token)
    expect(err).toBeNull()
    expect(user).toBeTruthy() // no-exp path, unchanged behaviour
  })

  test('exp exactly at now is treated as expired (fails closed)', async () => {
    parseStreamAndTime.mockImplementation(() =>
      Promise.resolve({ stream: '123456789010', start: 1, end: 2 }))
    const exp = Math.floor(Date.now() / 1000)
    const token = getStreamRangeToken('123456789010', 1, 2, exp)
    const { err, user } = await verify(
      { originalUrl: ASSET_URL, rfcx: {}, query: { exp: String(exp) } }, token)
    expect(err).toBeNull()
    expect(user).toBeFalsy()
  })
})
